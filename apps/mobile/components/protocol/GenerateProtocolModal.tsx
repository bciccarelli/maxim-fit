import { View, Text, StyleSheet, Modal, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useState, useCallback, useEffect } from 'react';
import { X, ChevronLeft, Sparkles } from 'lucide-react-native';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { useRatingPromptContext } from '@/contexts/RatingPromptContext';
import { GoalsStep } from './wizard/GoalsStep';
import { RequirementsStep } from './wizard/RequirementsStep';
import { PersonalInfoStep } from './wizard/PersonalInfoStep';
import { GeneratingStep } from './wizard/GeneratingStep';
import type { WizardStep, WizardState } from './wizard/types';
import type { Goal, PersonalInfo } from '@protocol/shared/schemas';

interface GenerateProtocolModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (protocolId: string) => void;
  initialConfig?: {
    personal_info?: Partial<PersonalInfo>;
    goals?: Goal[];
    requirements?: string[];
  };
}

interface GenerateResult {
  id: string;
  name: string;
  evaluation: {
    requirements_met: boolean;
    weighted_goal_score: number;
    viability_score: number;
  };
}

const STEP_TITLES = ['Goals', 'Requirements', 'Personal Info', 'Generating'];

export function GenerateProtocolModal({
  visible,
  onClose,
  onComplete,
  initialConfig,
}: GenerateProtocolModalProps) {
  const [step, setStep] = useState<WizardStep>(0);
  const [goals, setGoals] = useState<Goal[]>(initialConfig?.goals ?? []);
  const [requirements, setRequirements] = useState<string[]>(initialConfig?.requirements ?? []);
  const [personalInfo, setPersonalInfo] = useState<Partial<PersonalInfo>>(
    initialConfig?.personal_info ?? {
      lifestyle_considerations: [],
      dietary_restrictions: [],
    }
  );

  // Sync state when initialConfig changes (e.g., when loaded after mount)
  useEffect(() => {
    if (initialConfig && step === 0) {
      if (initialConfig.goals && initialConfig.goals.length > 0) {
        setGoals(initialConfig.goals);
      }
      if (initialConfig.requirements) {
        setRequirements(initialConfig.requirements);
      }
      if (initialConfig.personal_info) {
        setPersonalInfo(initialConfig.personal_info);
      }
    }
  }, [initialConfig, step]);

  const { streamedText, error, isStreaming, startStream, reset } =
    useSSEStream<GenerateResult>();

  const { recordCoreAction, maybeShowRatingPrompt } = useRatingPromptContext();

  const canProceed = useCallback(() => {
    switch (step) {
      case 0: // Goals - just need at least one goal
        return goals.length > 0;
      case 1: // Requirements - always valid
        return true;
      case 2: // Personal Info
        return !!(
          personalInfo.age &&
          personalInfo.weight_lbs &&
          personalInfo.height_in &&
          personalInfo.sex &&
          personalInfo.fitness_level
        );
      default:
        return false;
    }
  }, [step, goals, personalInfo]);

  const handleNext = useCallback(async () => {
    if (step < 2) {
      setStep((step + 1) as WizardStep);
    } else if (step === 2) {
      // Start generation
      setStep(3);

      const headers = await getAuthHeaders();

      // Normalize goal weights to sum to 1.0 for the API
      const totalWeight = goals.reduce((sum, g) => sum + g.weight, 0);
      const normalizedGoals = totalWeight > 0
        ? goals.map(g => ({ ...g, weight: g.weight / totalWeight }))
        : goals.map(g => ({ ...g, weight: 1 / goals.length }));

      const config = {
        personal_info: {
          ...personalInfo,
          lifestyle_considerations: personalInfo.lifestyle_considerations || [],
          dietary_restrictions: personalInfo.dietary_restrictions || [],
        } as PersonalInfo,
        goals: normalizedGoals,
        requirements,
      };

      const result = await startStream(apiUrl('/api/protocol/generate?stream=true'), {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (result?.id) {
        // Record core action and check for rating prompt
        recordCoreAction('protocol_generated');
        maybeShowRatingPrompt();

        onComplete(result.id);
        handleClose();
      }
    }
  }, [step, goals, requirements, personalInfo, startStream, onComplete, recordCoreAction, maybeShowRatingPrompt]);

  const handleBack = useCallback(() => {
    if (step > 0 && step < 3) {
      setStep((step - 1) as WizardStep);
    }
  }, [step]);

  const handleClose = useCallback(() => {
    // Reset state to initial values
    setStep(0);
    setGoals(initialConfig?.goals ?? []);
    setRequirements(initialConfig?.requirements ?? []);
    setPersonalInfo(
      initialConfig?.personal_info ?? {
        lifestyle_considerations: [],
        dietary_restrictions: [],
      }
    );
    reset();
    onClose();
  }, [onClose, reset, initialConfig]);

  const handleRetry = useCallback(() => {
    reset();
    setStep(2); // Go back to personal info
  }, [reset]);

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.stepDot,
            i === step && styles.stepDotActive,
            i < step && styles.stepDotComplete,
          ]}
        />
      ))}
    </View>
  );

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return <GoalsStep goals={goals} onChange={setGoals} />;
      case 1:
        return <RequirementsStep requirements={requirements} onChange={setRequirements} />;
      case 2:
        return <PersonalInfoStep personalInfo={personalInfo} onChange={setPersonalInfo} />;
      case 3:
        return (
          <GeneratingStep
            streamedText={streamedText}
            error={error}
            onRetry={handleRetry}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          {step > 0 && step < 3 ? (
            <Pressable onPress={handleBack} style={styles.backButton}>
              <ChevronLeft size={24} color="#666" />
            </Pressable>
          ) : (
            <View style={styles.placeholder} />
          )}
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{STEP_TITLES[step]}</Text>
            {step < 3 && renderStepIndicator()}
          </View>
          {step < 3 ? (
            <Pressable onPress={handleClose} style={styles.closeButton}>
              <X size={24} color="#666" />
            </Pressable>
          ) : (
            <View style={styles.placeholder} />
          )}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Footer */}
        {step < 3 && (
          <View style={styles.footer}>
            <Pressable
              style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!canProceed()}
            >
              {step === 2 ? (
                <>
                  <Sparkles size={18} color="#fff" />
                  <Text style={styles.nextButtonText}>Generate Protocol</Text>
                </>
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 6,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  closeButton: {
    padding: 8,
    width: 44,
    alignItems: 'flex-end',
  },
  placeholder: {
    width: 44,
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 6,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  stepDotActive: {
    backgroundColor: '#2d5a2d',
    width: 20,
  },
  stepDotComplete: {
    backgroundColor: '#2d5a2d',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d5a2d',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
