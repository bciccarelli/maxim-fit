import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import { fetchApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useProtocol } from '@/contexts/ProtocolContext';

export type ProtocolSchedule = {
  id: string;
  user_id: string;
  version_chain_id: string;
  start_date: string;
  end_date: string | null;
  label: string | null;
  created_at: string;
  updated_at: string;
  // Enriched fields from API
  protocol_name: string | null;
  weighted_goal_score: number | null;
};

type CreateScheduleParams = {
  versionChainId: string;
  startDate: string;
  endDate?: string | null;
  label?: string | null;
};

type UpdateScheduleParams = CreateScheduleParams & {
  id: string;
};

type ScheduleContextType = {
  schedules: ProtocolSchedule[];
  activeSchedule: ProtocolSchedule | null;
  isScheduleActive: boolean;
  isLoading: boolean;
  refreshSchedules: () => Promise<void>;
  createSchedule: (params: CreateScheduleParams) => Promise<ProtocolSchedule>;
  updateSchedule: (params: UpdateScheduleParams) => Promise<ProtocolSchedule>;
  deleteSchedule: (id: string) => Promise<void>;
  getScheduleForDate: (date: Date) => ProtocolSchedule | null;
  daysUntilEnd: number | null;
  nextSchedule: ProtocolSchedule | null;
};

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function dateInRange(date: string, start: string, end: string | null): boolean {
  if (date < start) return false;
  if (end === null) return true;
  return date <= end;
}

function daysBetween(from: string, to: string): number {
  const msPerDay = 86400000;
  return Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / msPerDay);
}

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { chains, selectChain } = useProtocol();

  const [schedules, setSchedules] = useState<ProtocolSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastCheckedDateRef = useRef<string>(formatDate(new Date()));

  const fetchSchedules = useCallback(async () => {
    if (!user) {
      setSchedules([]);
      return;
    }

    setIsLoading(true);
    try {
      const result = await fetchApi<{ schedules: ProtocolSchedule[] }>('/api/protocol/schedule');
      setSchedules(result.schedules);
    } catch (error) {
      console.error('Error fetching schedules:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initial fetch
  useEffect(() => {
    fetchSchedules();
  }, [user]);

  // Find the active schedule for today
  const today = formatDate(new Date());

  const activeSchedule = schedules.find(s => dateInRange(today, s.start_date, s.end_date)) ?? null;

  // Calculate days until active schedule ends
  const daysUntilEnd = activeSchedule?.end_date
    ? daysBetween(today, activeSchedule.end_date)
    : null;

  // Find the next schedule after the active one ends
  const nextSchedule = activeSchedule?.end_date
    ? schedules.find(s => s.start_date > activeSchedule.end_date! && s.id !== activeSchedule.id) ?? null
    : null;

  // Auto-select the chain when an active schedule is detected
  useEffect(() => {
    if (!activeSchedule) return;

    const matchingChain = chains.find(c => c.version_chain_id === activeSchedule.version_chain_id);
    if (matchingChain) {
      selectChain(matchingChain);
    }
  }, [activeSchedule?.id, chains]);

  // Midnight rollover: re-evaluate when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        const currentDate = formatDate(new Date());
        if (currentDate !== lastCheckedDateRef.current) {
          lastCheckedDateRef.current = currentDate;
          fetchSchedules();
        }
      }
    });
    return () => subscription.remove();
  }, [fetchSchedules]);

  const getScheduleForDate = useCallback((date: Date): ProtocolSchedule | null => {
    const dateStr = formatDate(date);
    return schedules.find(s => dateInRange(dateStr, s.start_date, s.end_date)) ?? null;
  }, [schedules]);

  const createSchedule = useCallback(async (params: CreateScheduleParams): Promise<ProtocolSchedule> => {
    const result = await fetchApi<{ schedule: ProtocolSchedule }>('/api/protocol/schedule', {
      method: 'POST',
      body: JSON.stringify({
        versionChainId: params.versionChainId,
        startDate: params.startDate,
        endDate: params.endDate || null,
        label: params.label || null,
      }),
    });
    await fetchSchedules();
    return result.schedule;
  }, [fetchSchedules]);

  const updateSchedule = useCallback(async (params: UpdateScheduleParams): Promise<ProtocolSchedule> => {
    const result = await fetchApi<{ schedule: ProtocolSchedule }>('/api/protocol/schedule', {
      method: 'POST',
      body: JSON.stringify({
        id: params.id,
        versionChainId: params.versionChainId,
        startDate: params.startDate,
        endDate: params.endDate || null,
        label: params.label || null,
      }),
    });
    await fetchSchedules();
    return result.schedule;
  }, [fetchSchedules]);

  const deleteSchedule = useCallback(async (id: string): Promise<void> => {
    await fetchApi('/api/protocol/schedule', {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    });
    await fetchSchedules();
  }, [fetchSchedules]);

  return (
    <ScheduleContext.Provider
      value={{
        schedules,
        activeSchedule,
        isScheduleActive: activeSchedule !== null,
        isLoading,
        refreshSchedules: fetchSchedules,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        getScheduleForDate,
        daysUntilEnd,
        nextSchedule,
      }}
    >
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (context === undefined) {
    throw new Error('useSchedule must be used within a ScheduleProvider');
  }
  return context;
}
