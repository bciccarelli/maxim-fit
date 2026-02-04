import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check, Flame, Clock, Utensils, Pill, Dumbbell, Droplets, ChevronRight } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRatingPromptContext } from '@/contexts/RatingPromptContext';
import { normalizeProtocol } from '@protocol/shared/schemas';
import type { DailyProtocol, DayOfWeek } from '@protocol/shared/schemas';
import { useComplianceTracking, ActivityType } from '@/hooks/useComplianceTracking';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';

type ProtocolChain = {
  id: string;
  name: string | null;
  version_chain_id: string;
};

type ProtocolVersion = {
  id: string;
  protocol_data: unknown;
};

interface TodayActivity {
  type: ActivityType;
  index: number;
  name: string;
  time?: string;
  details?: string;
}

function getDayOfWeek(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()] as DayOfWeek;
}

function getTodayActivities(protocol: DailyProtocol): {
  scheduleBlocks: TodayActivity[];
  meals: TodayActivity[];
  supplements: TodayActivity[];
  workout: TodayActivity | null;
  hydrationTarget: number;
} {
  const today = getDayOfWeek(new Date());

  // Find schedule variant for today
  const scheduleVariant = protocol.schedules.find(s => s.days.includes(today));

  // Find workout for today
  const todayWorkout = protocol.training.workouts.find(w => {
    const workoutDay = w.day.toLowerCase();
    return workoutDay === today ||
      workoutDay === today.charAt(0).toUpperCase() + today.slice(1);
  });

  return {
    scheduleBlocks: (scheduleVariant?.other_events || []).map((event, index) => ({
      type: 'schedule_block' as ActivityType,
      index,
      name: event.activity,
      time: event.start_time,
      details: `${event.start_time} – ${event.end_time}`,
    })),
    meals: protocol.diet.meals.map((meal, index) => ({
      type: 'meal' as ActivityType,
      index,
      name: meal.name,
      time: meal.time,
      details: `${meal.calories} cal · P ${meal.protein_g}g`,
    })),
    supplements: protocol.supplementation.supplements.map((supp, index) => ({
      type: 'supplement' as ActivityType,
      index,
      name: supp.name,
      time: supp.time,
      details: `${supp.dosage_amount} ${supp.dosage_unit}`,
    })),
    workout: todayWorkout ? {
      type: 'workout' as ActivityType,
      index: 0,
      name: todayWorkout.name,
      time: todayWorkout.time,
      details: `${todayWorkout.duration_min} min · ${todayWorkout.exercises.length} exercises`,
    } : null,
    hydrationTarget: protocol.diet.hydration_oz,
  };
}

export default function ProgressScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { recordCoreAction, maybeShowRatingPrompt } = useRatingPromptContext();

  // Protocol selection
  const [chains, setChains] = useState<ProtocolChain[]>([]);
  const [selectedChain, setSelectedChain] = useState<ProtocolChain | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<ProtocolVersion | null>(null);
  const [parsedProtocol, setParsedProtocol] = useState<DailyProtocol | null>(null);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Generate modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);

  // Track streak milestone for rating prompt (only trigger once per session)
  const hasRecordedStreakMilestoneRef = useRef(false);

  // Expanded sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    schedule: false,
    meals: true,
    supplements: true,
    workouts: true,
    hydration: true,
  });

  // Compliance tracking
  const {
    logs,
    summary,
    stats,
    isLoading: isLoadingCompliance,
    isCompleted,
    toggleCompletion,
    refresh: refreshCompliance,
  } = useComplianceTracking(selectedVersion?.id || null);

  // Fetch protocol chains
  const fetchChains = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('protocols')
      .select('id, name, version_chain_id')
      .eq('user_id', user.id)
      .eq('is_current', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching protocols:', error);
      return;
    }

    if (data && data.length > 0) {
      setChains(data);
      if (!selectedChain) {
        setSelectedChain(data[0]);
      }
    }
  }, [user, selectedChain]);

  // Fetch selected protocol version
  const fetchVersion = useCallback(async () => {
    if (!selectedChain) return;

    const { data, error } = await supabase
      .from('protocols')
      .select('id, protocol_data')
      .eq('version_chain_id', selectedChain.version_chain_id)
      .eq('is_current', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching version:', error);
      return;
    }

    if (data && data.length > 0) {
      setSelectedVersion(data[0]);
      try {
        const normalized = normalizeProtocol(data[0].protocol_data);
        setParsedProtocol(normalized);
      } catch (e) {
        console.error('Error parsing protocol:', e);
        setParsedProtocol(null);
      }
    }
  }, [selectedChain]);

  // Initial fetch
  useEffect(() => {
    fetchChains().finally(() => setIsLoading(false));
  }, [fetchChains]);

  // Fetch version when chain changes
  useEffect(() => {
    if (selectedChain) {
      fetchVersion();
    }
  }, [selectedChain, fetchVersion]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([fetchChains(), fetchVersion(), refreshCompliance()]);
    setIsRefreshing(false);
  }, [fetchChains, fetchVersion, refreshCompliance]);

  // Get today's activities
  const todayActivities = useMemo(() => {
    if (!parsedProtocol) return null;
    return getTodayActivities(parsedProtocol);
  }, [parsedProtocol]);

  // Calculate overall progress percentage
  const overallProgress = useMemo(() => {
    if (!summary || !todayActivities) return 0;

    const scheduleTotal = todayActivities.scheduleBlocks.length;
    const mealsTotal = todayActivities.meals.length;
    const supplementsTotal = todayActivities.supplements.length;
    const workoutsTotal = todayActivities.workout ? 1 : 0;

    const totalActivities = scheduleTotal + mealsTotal + supplementsTotal + workoutsTotal + 1; // +1 for hydration
    const completed =
      summary.scheduleCompleted +
      summary.mealsCompleted +
      summary.supplementsCompleted +
      summary.workoutsCompleted +
      (summary.hydrationCompleted ? 1 : 0);

    return totalActivities > 0 ? Math.round((completed / totalActivities) * 100) : 0;
  }, [summary, todayActivities]);

  const handleChainSelect = (chain: ProtocolChain) => {
    setSelectedChain(chain);
    setShowDropdown(false);
    setSelectedVersion(null);
    setParsedProtocol(null);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleActivityToggle = async (activity: TodayActivity) => {
    try {
      const wasCompleted = isCompleted(activity.type, activity.index);
      await toggleCompletion(activity.type, activity.index, activity.name, activity.time);

      // Record core action when completing a workout (not uncompleting)
      if (activity.type === 'workout' && !wasCompleted) {
        recordCoreAction('workout_completed');
        maybeShowRatingPrompt();
      }
    } catch (err) {
      console.error('Failed to toggle activity:', err);
    }
  };

  // Watch for streak milestones (3+ days) to trigger rating prompt
  useEffect(() => {
    if (
      stats?.currentStreak &&
      stats.currentStreak >= 3 &&
      !hasRecordedStreakMilestoneRef.current
    ) {
      hasRecordedStreakMilestoneRef.current = true;
      recordCoreAction('compliance_streak_3');
      maybeShowRatingPrompt();
    }
  }, [stats?.currentStreak, recordCoreAction, maybeShowRatingPrompt]);

  const handleGenerateComplete = useCallback(async () => {
    // Refresh protocols list
    await fetchChains();
  }, [fetchChains]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#2d5a2d" />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2d5a2d" />
        }
      >
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No protocols yet</Text>
          <Text style={styles.emptyText}>
            Create a protocol to start tracking your daily progress.
          </Text>
          <Pressable
            style={styles.generateButton}
            onPress={() => setShowGenerateModal(true)}
          >
            <Text style={styles.generateButtonText}>Generate Protocol</Text>
          </Pressable>
        </View>
        <GenerateProtocolModal
          visible={showGenerateModal}
          onClose={() => setShowGenerateModal(false)}
          onComplete={handleGenerateComplete}
        />
      </ScrollView>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header with Protocol Selector */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Today's Progress</Text>
          <Text style={styles.headerDate}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.dropdownWrapper}>
          <Pressable
            style={styles.dropdownButton}
            onPress={() => setShowDropdown(!showDropdown)}
          >
            <Text style={styles.dropdownButtonText} numberOfLines={1}>
              {selectedChain?.name || 'Select'}
            </Text>
            <ChevronDown size={16} color="#666" />
          </Pressable>

          {showDropdown && (
            <View style={styles.dropdownMenu}>
              {chains.map((chain) => (
                <Pressable
                  key={chain.id}
                  style={[
                    styles.dropdownItem,
                    chain.id === selectedChain?.id && styles.dropdownItemSelected,
                  ]}
                  onPress={() => handleChainSelect(chain)}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      chain.id === selectedChain?.id && styles.dropdownItemTextSelected,
                    ]}
                    numberOfLines={1}
                  >
                    {chain.name || 'Untitled Protocol'}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor="#2d5a2d" />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Progress Card */}
        <View style={styles.heroCard}>
          <View style={styles.progressCircle}>
            <Text style={styles.progressPercentage}>{overallProgress}</Text>
            <Text style={styles.progressPercentSign}>%</Text>
          </View>
          <Text style={styles.progressLabel}>completed today</Text>

          {/* Category Summary */}
          {summary && todayActivities && (
            <View style={styles.categorySummary}>
              <View style={styles.categoryChip}>
                <Clock size={12} color="#666" />
                <Text style={styles.categoryChipText}>
                  {summary.scheduleCompleted}/{todayActivities.scheduleBlocks.length}
                </Text>
              </View>
              <View style={styles.categoryChip}>
                <Utensils size={12} color="#666" />
                <Text style={styles.categoryChipText}>
                  {summary.mealsCompleted}/{todayActivities.meals.length}
                </Text>
              </View>
              <View style={styles.categoryChip}>
                <Pill size={12} color="#666" />
                <Text style={styles.categoryChipText}>
                  {summary.supplementsCompleted}/{todayActivities.supplements.length}
                </Text>
              </View>
              {todayActivities.workout && (
                <View style={styles.categoryChip}>
                  <Dumbbell size={12} color="#666" />
                  <Text style={styles.categoryChipText}>
                    {summary.workoutsCompleted}/1
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Streak Card */}
        {stats && stats.currentStreak > 0 && (
          <View style={styles.streakCard}>
            <View style={styles.streakContent}>
              <Flame size={24} color="#f59e0b" />
              <Text style={styles.streakNumber}>{stats.currentStreak}</Text>
              <Text style={styles.streakLabel}>day streak</Text>
            </View>
            {stats.longestStreak > stats.currentStreak && (
              <Text style={styles.bestStreak}>Best: {stats.longestStreak} days</Text>
            )}
          </View>
        )}

        {/* Activity Sections */}
        {todayActivities && (
          <>
            {/* Meals Section */}
            <CategorySection
              title="Meals"
              icon={<Utensils size={16} color="#2d5a2d" />}
              expanded={expandedSections.meals}
              onToggle={() => toggleSection('meals')}
              completed={summary?.mealsCompleted || 0}
              total={todayActivities.meals.length}
            >
              {todayActivities.meals.map((meal) => (
                <ActivityChecklistItem
                  key={`meal-${meal.index}`}
                  activity={meal}
                  completed={isCompleted('meal', meal.index)}
                  onToggle={() => handleActivityToggle(meal)}
                />
              ))}
            </CategorySection>

            {/* Supplements Section */}
            <CategorySection
              title="Supplements"
              icon={<Pill size={16} color="#2d5a2d" />}
              expanded={expandedSections.supplements}
              onToggle={() => toggleSection('supplements')}
              completed={summary?.supplementsCompleted || 0}
              total={todayActivities.supplements.length}
            >
              {todayActivities.supplements.map((supp) => (
                <ActivityChecklistItem
                  key={`supp-${supp.index}`}
                  activity={supp}
                  completed={isCompleted('supplement', supp.index)}
                  onToggle={() => handleActivityToggle(supp)}
                />
              ))}
            </CategorySection>

            {/* Workout Section */}
            {todayActivities.workout && (
              <CategorySection
                title="Workout"
                icon={<Dumbbell size={16} color="#2d5a2d" />}
                expanded={expandedSections.workouts}
                onToggle={() => toggleSection('workouts')}
                completed={summary?.workoutsCompleted || 0}
                total={1}
              >
                <ActivityChecklistItem
                  activity={todayActivities.workout}
                  completed={isCompleted('workout', 0)}
                  onToggle={() => handleActivityToggle(todayActivities.workout!)}
                />
              </CategorySection>
            )}

            {/* Hydration Section */}
            <CategorySection
              title="Hydration"
              icon={<Droplets size={16} color="#2d5a2d" />}
              expanded={expandedSections.hydration}
              onToggle={() => toggleSection('hydration')}
              completed={summary?.hydrationCompleted ? 1 : 0}
              total={1}
            >
              <ActivityChecklistItem
                activity={{
                  type: 'hydration',
                  index: 0,
                  name: `Met hydration goal`,
                  details: `${todayActivities.hydrationTarget} oz target`,
                }}
                completed={summary?.hydrationCompleted || false}
                onToggle={() => handleActivityToggle({
                  type: 'hydration',
                  index: 0,
                  name: 'Hydration goal',
                })}
              />
            </CategorySection>

            {/* Schedule Section */}
            {todayActivities.scheduleBlocks.length > 0 && (
              <CategorySection
                title="Schedule"
                icon={<Clock size={16} color="#2d5a2d" />}
                expanded={expandedSections.schedule}
                onToggle={() => toggleSection('schedule')}
                completed={summary?.scheduleCompleted || 0}
                total={todayActivities.scheduleBlocks.length}
              >
                {todayActivities.scheduleBlocks.map((block) => (
                  <ActivityChecklistItem
                    key={`block-${block.index}`}
                    activity={block}
                    completed={isCompleted('schedule_block', block.index)}
                    onToggle={() => handleActivityToggle(block)}
                  />
                ))}
              </CategorySection>
            )}
          </>
        )}

        {/* Weekly Progress */}
        {stats && stats.dailyStats.length > 0 && (
          <View style={styles.weeklyCard}>
            <Text style={styles.weeklyTitle}>Last 7 Days</Text>
            <View style={styles.weeklyBars}>
              {stats.dailyStats.slice(-7).map((day, i) => {
                const isToday = day.date === new Date().toISOString().split('T')[0];
                return (
                  <View key={day.date} style={styles.barContainer}>
                    <View style={styles.barWrapper}>
                      <View
                        style={[
                          styles.bar,
                          { height: `${day.percentage}%` },
                          isToday && styles.barToday,
                        ]}
                      />
                    </View>
                    <Text style={[styles.barLabel, isToday && styles.barLabelToday]}>
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'narrow' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Category Section Component
interface CategorySectionProps {
  title: string;
  icon: React.ReactNode;
  expanded: boolean;
  onToggle: () => void;
  completed: number;
  total: number;
  children: React.ReactNode;
}

function CategorySection({ title, icon, expanded, onToggle, completed, total, children }: CategorySectionProps) {
  const allComplete = completed === total && total > 0;

  return (
    <View style={styles.section}>
      <Pressable style={styles.sectionHeader} onPress={onToggle}>
        <View style={styles.sectionLeft}>
          {icon}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        <View style={styles.sectionRight}>
          <Text style={[styles.sectionCount, allComplete && styles.sectionCountComplete]}>
            {completed}/{total}
          </Text>
          <ChevronRight
            size={16}
            color="#999"
            style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
          />
        </View>
      </Pressable>
      {expanded && <View style={styles.sectionContent}>{children}</View>}
    </View>
  );
}

// Activity Checklist Item Component
interface ActivityChecklistItemProps {
  activity: TodayActivity;
  completed: boolean;
  onToggle: () => void;
}

function ActivityChecklistItem({ activity, completed, onToggle }: ActivityChecklistItemProps) {
  return (
    <Pressable style={styles.checklistItem} onPress={onToggle}>
      <View style={[styles.checkbox, completed && styles.checkboxChecked]}>
        {completed && <Check size={14} color="#fff" strokeWidth={3} />}
      </View>
      <View style={styles.checklistContent}>
        <Text style={[styles.checklistName, completed && styles.checklistNameCompleted]}>
          {activity.name}
        </Text>
        {activity.details && (
          <Text style={styles.checklistDetails}>{activity.details}</Text>
        )}
      </View>
      {activity.time && (
        <Text style={styles.checklistTime}>{activity.time}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: '#2d5a2d',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a2e1a',
  },
  headerDate: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    maxWidth: 160,
  },
  dropdownButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1a2e1a',
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: 200,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemSelected: {
    backgroundColor: '#e8f5e9',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333',
  },
  dropdownItemTextSelected: {
    color: '#2d5a2d',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: '#2d5a2d',
  },
  progressCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressPercentage: {
    fontSize: 56,
    fontWeight: '700',
    color: '#2d5a2d',
    fontVariant: ['tabular-nums'],
  },
  progressPercentSign: {
    fontSize: 24,
    fontWeight: '600',
    color: '#2d5a2d',
  },
  progressLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  categorySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  streakCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streakNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a2e1a',
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: 14,
    color: '#666',
  },
  bestStreak: {
    fontSize: 12,
    color: '#999',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  sectionCountComplete: {
    color: '#2d5a2d',
  },
  sectionContent: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#2d5a2d',
    borderColor: '#2d5a2d',
  },
  checklistContent: {
    flex: 1,
  },
  checklistName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a2e1a',
  },
  checklistNameCompleted: {
    color: '#999',
    textDecorationLine: 'line-through',
  },
  checklistDetails: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  checklistTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    fontVariant: ['tabular-nums'],
  },
  weeklyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  weeklyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a2e1a',
    marginBottom: 12,
  },
  weeklyBars: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 80,
  },
  barContainer: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  barWrapper: {
    width: 24,
    height: 60,
    backgroundColor: '#f5f5f0',
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: '#2d5a2d',
    borderRadius: 4,
    minHeight: 2,
  },
  barToday: {
    backgroundColor: '#4d8a4d',
  },
  barLabel: {
    fontSize: 10,
    color: '#999',
    fontWeight: '500',
  },
  barLabelToday: {
    color: '#2d5a2d',
    fontWeight: '600',
  },
});
