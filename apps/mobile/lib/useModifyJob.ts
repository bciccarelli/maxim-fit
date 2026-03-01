import { useState, useCallback, useRef, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchApi, apiUrl, getAuthHeaders, UpgradeRequiredError } from './api';
import type { ClarifyingQuestion, Citation, QuestionAnswer, DailyProtocol, VerificationResult } from '@protocol/shared/schemas';

const ACTIVE_JOB_KEY = 'modify_active_job';

export type JobStatus =
  | 'idle'
  | 'pending'
  | 'researching'
  | 'research_complete'
  | 'awaiting_answers'
  | 'applying'
  | 'verifying'
  | 'completed'
  | 'failed';

export interface ModifyProposal {
  protocol: DailyProtocol;
  reasoning: string;
  verification: VerificationResult;
  citations?: Citation[];
}

export interface QuestionsData {
  questions: ClarifyingQuestion[];
  citations: Citation[];
  researchSummary: string;
}

export interface ModifyJobState {
  /** Current job ID */
  jobId: string | null;
  /** Job status */
  status: JobStatus;
  /** Current processing stage (for UI feedback) */
  stage: string | null;
  /** Questions data if the modify flow needs clarification */
  questions: QuestionsData | null;
  /** Final modification proposal */
  proposal: ModifyProposal | null;
  /** Current scores for comparison */
  currentScores: { weighted_goal_score: number | null; requirements_met: boolean | null } | null;
  /** Modification ID for accept/reject */
  modificationId: string | null;
  /** Error message if job failed */
  error: string | null;
  /** Whether we're actively polling/streaming */
  isLoading: boolean;
  /** Whether a Pro subscription is required */
  upgradeRequired: boolean;
}

export interface UseModifyJobReturn extends ModifyJobState {
  /** Start a new modify job */
  startJob: (protocolId: string, userMessage: string) => Promise<void>;
  /** Resume monitoring an existing job (e.g., after app resume) */
  resumeJob: (jobId: string) => Promise<void>;
  /** Submit answers to clarifying questions */
  submitAnswers: (answers: QuestionAnswer[]) => Promise<void>;
  /** Check job status (manual poll) */
  checkStatus: () => Promise<void>;
  /** Clear state and persisted job ID */
  reset: () => void;
}

/**
 * Hook for managing background-resilient modify jobs.
 *
 * This hook handles:
 * - Starting new modify jobs
 * - Polling for status when app returns to foreground
 * - Persisting active job ID to AsyncStorage
 * - Handling the questions flow
 * - Recovering state after app backgrounding/kill
 */
export function useModifyJob(): UseModifyJobReturn {
  const [state, setState] = useState<ModifyJobState>({
    jobId: null,
    status: 'idle',
    stage: null,
    questions: null,
    proposal: null,
    currentScores: null,
    modificationId: null,
    error: null,
    isLoading: false,
    upgradeRequired: false,
  });

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Clear any active polling
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // Persist job ID to AsyncStorage
  const persistJobId = useCallback(async (jobId: string | null) => {
    try {
      if (jobId) {
        await AsyncStorage.setItem(ACTIVE_JOB_KEY, jobId);
      } else {
        await AsyncStorage.removeItem(ACTIVE_JOB_KEY);
      }
    } catch (e) {
      console.error('[useModifyJob] Error persisting job ID:', e);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    stopPolling();
    persistJobId(null);
    setState({
      jobId: null,
      status: 'idle',
      stage: null,
      questions: null,
      proposal: null,
      currentScores: null,
      modificationId: null,
      error: null,
      isLoading: false,
      upgradeRequired: false,
    });
  }, [stopPolling, persistJobId]);

  // Check job status
  const checkStatus = useCallback(async () => {
    const { jobId } = state;
    if (!jobId) return;

    try {
      const response = await fetchApi<{
        jobId: string;
        status: JobStatus;
        stage?: string;
        questions?: ClarifyingQuestion[];
        researchSummary?: string;
        citations?: Citation[];
        modificationId?: string;
        proposal?: ModifyProposal;
        currentScores?: { weighted_goal_score: number | null; requirements_met: boolean | null };
        error?: string;
      }>(`/api/protocol/modify/status/${jobId}`);

      // Update state based on response
      setState(prev => {
        const newState: ModifyJobState = {
          ...prev,
          status: response.status,
          stage: response.stage || null,
        };

        switch (response.status) {
          case 'awaiting_answers':
            newState.questions = {
              questions: response.questions || [],
              citations: response.citations || [],
              researchSummary: response.researchSummary || '',
            };
            newState.isLoading = false;
            stopPolling();
            break;

          case 'completed':
            newState.proposal = response.proposal || null;
            newState.currentScores = response.currentScores || null;
            newState.modificationId = response.modificationId || null;
            newState.isLoading = false;
            stopPolling();
            persistJobId(null); // Clear persisted job
            break;

          case 'failed':
            newState.error = response.error || 'Job failed';
            newState.isLoading = false;
            stopPolling();
            persistJobId(null); // Clear persisted job
            break;

          default:
            // Still processing
            newState.isLoading = true;
        }

        return newState;
      });

    } catch (e) {
      console.error('[useModifyJob] Error checking status:', e);
      if (e instanceof UpgradeRequiredError) {
        setState(prev => ({
          ...prev,
          error: e.message,
          upgradeRequired: true,
          isLoading: false,
        }));
        stopPolling();
      }
    }
  }, [state.jobId, stopPolling, persistJobId]);

  // Start polling for status
  const startPolling = useCallback((jobId: string) => {
    stopPolling();

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await fetchApi<{
          status: JobStatus;
          stage?: string;
          questions?: ClarifyingQuestion[];
          researchSummary?: string;
          citations?: Citation[];
          modificationId?: string;
          proposal?: ModifyProposal;
          currentScores?: { weighted_goal_score: number | null; requirements_met: boolean | null };
          error?: string;
        }>(`/api/protocol/modify/status/${jobId}`);

        setState(prev => {
          if (prev.jobId !== jobId) return prev; // Job changed

          const newState: ModifyJobState = {
            ...prev,
            status: response.status,
            stage: response.stage || null,
          };

          if (response.status === 'awaiting_answers') {
            newState.questions = {
              questions: response.questions || [],
              citations: response.citations || [],
              researchSummary: response.researchSummary || '',
            };
            newState.isLoading = false;
            stopPolling();
          } else if (response.status === 'completed') {
            newState.proposal = response.proposal || null;
            newState.currentScores = response.currentScores || null;
            newState.modificationId = response.modificationId || null;
            newState.isLoading = false;
            stopPolling();
            persistJobId(null);
          } else if (response.status === 'failed') {
            newState.error = response.error || 'Job failed';
            newState.isLoading = false;
            stopPolling();
            persistJobId(null);
          }

          return newState;
        });
      } catch (e) {
        console.error('[useModifyJob] Polling error:', e);
      }
    }, 2000);
  }, [stopPolling, persistJobId]);

  // Start a new modify job
  const startJob = useCallback(async (protocolId: string, userMessage: string) => {
    try {
      stopPolling();

      setState(prev => ({
        ...prev,
        status: 'pending',
        stage: 'starting',
        isLoading: true,
        error: null,
        upgradeRequired: false,
        questions: null,
        proposal: null,
      }));

      // Step 1: Create the job
      const startResponse = await fetchApi<{
        jobId: string;
        status: string;
        resumed?: boolean;
      }>('/api/protocol/modify/start', {
        method: 'POST',
        body: JSON.stringify({ protocolId, userMessage }),
      });

      const { jobId, resumed } = startResponse;

      setState(prev => ({
        ...prev,
        jobId,
        status: 'pending',
      }));

      // Persist the job ID
      await persistJobId(jobId);

      if (resumed) {
        // Existing job - check its status
        startPolling(jobId);
        return;
      }

      // Step 2: Trigger processing
      const headers = await getAuthHeaders();
      fetch(apiUrl('/api/protocol/modify/process'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify({ jobId }),
      }).catch(err => console.error('[useModifyJob] Error triggering process:', err));

      // Step 3: Start polling for updates
      startPolling(jobId);

    } catch (e) {
      console.error('[useModifyJob] Error starting job:', e);

      if (e instanceof UpgradeRequiredError) {
        setState(prev => ({
          ...prev,
          error: e.message,
          upgradeRequired: true,
          isLoading: false,
          status: 'idle',
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: e instanceof Error ? e.message : 'Failed to start job',
          isLoading: false,
          status: 'failed',
        }));
      }
    }
  }, [stopPolling, startPolling, persistJobId]);

  // Resume monitoring an existing job
  const resumeJob = useCallback(async (jobId: string) => {
    try {
      setState(prev => ({
        ...prev,
        jobId,
        isLoading: true,
        error: null,
      }));

      // Check current status
      const response = await fetchApi<{
        status: JobStatus;
        stage?: string;
        questions?: ClarifyingQuestion[];
        researchSummary?: string;
        citations?: Citation[];
        modificationId?: string;
        proposal?: ModifyProposal;
        currentScores?: { weighted_goal_score: number | null; requirements_met: boolean | null };
        error?: string;
      }>(`/api/protocol/modify/status/${jobId}`);

      setState(prev => {
        const newState: ModifyJobState = {
          ...prev,
          jobId,
          status: response.status,
          stage: response.stage || null,
        };

        switch (response.status) {
          case 'awaiting_answers':
            newState.questions = {
              questions: response.questions || [],
              citations: response.citations || [],
              researchSummary: response.researchSummary || '',
            };
            newState.isLoading = false;
            break;

          case 'completed':
            newState.proposal = response.proposal || null;
            newState.currentScores = response.currentScores || null;
            newState.modificationId = response.modificationId || null;
            newState.isLoading = false;
            persistJobId(null);
            break;

          case 'failed':
            newState.error = response.error || 'Job failed';
            newState.isLoading = false;
            persistJobId(null);
            break;

          default:
            // Still processing - start polling
            newState.isLoading = true;
            startPolling(jobId);
        }

        return newState;
      });

    } catch (e) {
      console.error('[useModifyJob] Error resuming job:', e);
      setState(prev => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Failed to resume job',
        isLoading: false,
      }));
    }
  }, [startPolling, persistJobId]);

  // Submit answers to clarifying questions
  const submitAnswers = useCallback(async (answers: QuestionAnswer[]) => {
    const { jobId } = state;
    if (!jobId) {
      console.error('[useModifyJob] No job ID for submitting answers');
      return;
    }

    try {
      setState(prev => ({
        ...prev,
        status: 'applying',
        stage: 'applying',
        isLoading: true,
        questions: null,
      }));

      await fetchApi('/api/protocol/modify/answers', {
        method: 'POST',
        body: JSON.stringify({ jobId, answers }),
      });

      // Start polling for completion
      startPolling(jobId);

    } catch (e) {
      console.error('[useModifyJob] Error submitting answers:', e);
      setState(prev => ({
        ...prev,
        error: e instanceof Error ? e.message : 'Failed to submit answers',
        isLoading: false,
      }));
    }
  }, [state.jobId, startPolling]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextState;

      // App came to foreground
      if (prevState.match(/inactive|background/) && nextState === 'active') {
        // Check if there's an active job to resume
        const { jobId } = state;
        if (jobId && state.status !== 'completed' && state.status !== 'failed' && state.status !== 'idle') {
          console.log('[useModifyJob] App foregrounded, checking job status');
          // Re-check status immediately
          try {
            const response = await fetchApi<{
              status: JobStatus;
              stage?: string;
              questions?: ClarifyingQuestion[];
              researchSummary?: string;
              citations?: Citation[];
              modificationId?: string;
              proposal?: ModifyProposal;
              currentScores?: { weighted_goal_score: number | null; requirements_met: boolean | null };
              error?: string;
            }>(`/api/protocol/modify/status/${jobId}`);

            setState(prev => {
              if (prev.jobId !== jobId) return prev;

              const newState: ModifyJobState = {
                ...prev,
                status: response.status,
                stage: response.stage || null,
              };

              if (response.status === 'awaiting_answers') {
                newState.questions = {
                  questions: response.questions || [],
                  citations: response.citations || [],
                  researchSummary: response.researchSummary || '',
                };
                newState.isLoading = false;
              } else if (response.status === 'completed') {
                newState.proposal = response.proposal || null;
                newState.currentScores = response.currentScores || null;
                newState.modificationId = response.modificationId || null;
                newState.isLoading = false;
                persistJobId(null);
              } else if (response.status === 'failed') {
                newState.error = response.error || 'Job failed';
                newState.isLoading = false;
                persistJobId(null);
              } else {
                // Still processing - resume polling
                newState.isLoading = true;
                startPolling(jobId);
              }

              return newState;
            });
          } catch (e) {
            console.error('[useModifyJob] Error checking status on foreground:', e);
          }
        }
      }
    });

    return () => subscription.remove();
  }, [state.jobId, state.status, startPolling, persistJobId]);

  // On mount, check for persisted job
  useEffect(() => {
    AsyncStorage.getItem(ACTIVE_JOB_KEY).then(jobId => {
      if (jobId) {
        console.log('[useModifyJob] Found persisted job:', jobId);
        resumeJob(jobId);
      }
    }).catch(e => {
      console.error('[useModifyJob] Error reading persisted job:', e);
    });
  }, [resumeJob]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...state,
    startJob,
    resumeJob,
    submitAnswers,
    checkStatus,
    reset,
  };
}
