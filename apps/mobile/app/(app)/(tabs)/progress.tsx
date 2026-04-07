import { View, Text, StyleSheet, Pressable, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronDown, Check, Flame, Clock, Utensils, Pill, Dumbbell, Droplets, ChevronRight, Calendar, AlertCircle } from 'lucide-react-native';
import { useProtocol, type ProtocolChain } from '@/contexts/ProtocolContext';
import { useSchedule } from '@/contexts/ScheduleContext';
import { useRatingPromptContext } from '@/contexts/RatingPromptContext';
import type { DailyProtocol, DayOfWeek } from '@protocol/shared/schemas';
import { useComplianceTracking, ActivityType } from '@/hooks/useComplianceTracking';
import { GenerateProtocolModal } from '@/components/protocol/GenerateProtocolModal';
import { useRouter } from 'expo-router';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

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

function formatDateShort(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[parseInt(m) - 1]} ${parseInt(d)}`;
}

export default function ProgressScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { recordCoreAction, maybeShowRatingPrompt } = useRatingPromptContext();

  // Use shared protocol context
  const {
    chains,
    selectedChain,
    selectChain,
    selectedVersion,
    parsedProtocol,
    isLoadingChains: isLoading,
    refreshChains,
  } = useProtocol();

  // Schedule context for active protocol resolution
  const { activeSchedule, isScheduleActive, daysUntilEnd, nextSchedule } = useSchedule();

  // Local UI state
  const [showDropdown, setShowDropdown] = useState(false);
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

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.all([refreshChains(), refreshCompliance()]);
    setIsRefreshing(false);
  }, [refreshChains, refreshCompliance]);

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
    selectChain(chain);
    setShowDropdown(false);
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
    await refreshChains();
  }, [refreshChains]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={colors.primaryContainer} />
      </View>
    );
  }

  if (chains.length === 0) {
    return (
      <ScrollView
        style={[styles.container, { paddingTop: insets.top }]}
        contentContainerStyle={styles.emptyContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />
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
            <ChevronDown size={16} color={colors.onSurfaceVariant} />
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primaryContainer} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Schedule Banner */}
        {isScheduleActive && activeSchedule && (
          <Pressable
            style={styles.scheduleBanner}
            onPress={() => router.push('/(app)/calendar' as any)}
          >
            <View style={styles.scheduleBannerLeft} />
            <Calendar size={14} color={colors.info} />
            <Text style={styles.scheduleBannerText} numberOfLines={1}>
              Following: {activeSchedule.label || activeSchedule.protocol_name || 'Scheduled Protocol'}
              {activeSchedule.end_date && (
                <Text style={styles.scheduleBannerDate}>
                  {' '}(ends {formatDateShort(activeSchedule.end_date)})
                </Text>
              )}
            </Text>
          </Pressable>
        )}

        {/* Transition Warning */}
        {isScheduleActive && daysUntilEnd !== null && daysUntilEnd <= 3 && !nextSchedule && (
          <View style={styles.transitionWarning}>
            <View style={styles.transitionWarningLeft} />
            <AlertCircle size={14} color={colors.warning} />
            <Text style={styles.transitionWarningText}>
              Current protocol ends in {daysUntilEnd} {daysUntilEnd === 1 ? 'day' : 'days'}
            </Text>
          </View>
        )}

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
                <Clock size={12} color={colors.onSurfaceVariant} />
                <Text style={styles.categoryChipText}>
                  {summary.scheduleCompleted}/{todayActivities.scheduleBlocks.length}
                </Text>
              </View>
              <View style={styles.categoryChip}>
                <Utensils size={12} color={colors.onSurfaceVariant} />
                <Text style={styles.categoryChipText}>
                  {summary.mealsCompleted}/{todayActivities.meals.length}
                </Text>
              </View>
              <View style={styles.categoryChip}>
                <Pill size={12} color={colors.onSurfaceVariant} />
                <Text style={styles.categoryChipText}>
                  {summary.supplementsCompleted}/{todayActivities.supplements.length}
                </Text>
              </View>
              {todayActivities.workout && (
                <View style={styles.categoryChip}>
                  <Dumbbell size={12} color={colors.onSurfaceVariant} />
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
              <Flame size={24} color={colors.warning} />
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
              icon={<Utensils size={16} color={colors.primaryContainer} />}
              expanded={expandedSections.meals}
              onToggle={() => toggleSection('meals')}
              completed={summary?.mealsCompleted || 0}
              total={todayActivities.meals.length}
            >
              {todayActivities.meals.map((meal, i) => (
                <ActivityChecklistItem
                  key={`meal-${meal.index}`}
                  activity={meal}
                  completed={isCompleted('meal', meal.index)}
                  onToggle={() => handleActivityToggle(meal)}
                  rowIndex={i}
                />
              ))}
            </CategorySection>

            {/* Supplements Section */}
            <CategorySection
              title="Supplements"
              icon={<Pill size={16} color={colors.primaryContainer} />}
              expanded={expandedSections.supplements}
              onToggle={() => toggleSection('supplements')}
              completed={summary?.supplementsCompleted || 0}
              total={todayActivities.supplements.length}
            >
              {todayActivities.supplements.map((supp, i) => (
                <ActivityChecklistItem
                  key={`supp-${supp.index}`}
                  activity={supp}
                  completed={isCompleted('supplement', supp.index)}
                  onToggle={() => handleActivityToggle(supp)}
                  rowIndex={i}
                />
              ))}
            </CategorySection>

            {/* Workout Section */}
            {todayActivities.workout && (
              <CategorySection
                title="Workout"
                icon={<Dumbbell size={16} color={colors.primaryContainer} />}
                expanded={expandedSections.workouts}
                onToggle={() => toggleSection('workouts')}
                completed={summary?.workoutsCompleted || 0}
                total={1}
              >
                <ActivityChecklistItem
                  activity={todayActivities.workout}
                  completed={isCompleted('workout', 0)}
                  onToggle={() => handleActivityToggle(todayActivities.workout!)}
                  rowIndex={0}
                />
              </CategorySection>
            )}

            {/* Hydration Section */}
            <CategorySection
              title="Hydration"
              icon={<Droplets size={16} color={colors.primaryContainer} />}
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
                rowIndex={0}
              />
            </CategorySection>

            {/* Schedule Section */}
            {todayActivities.scheduleBlocks.length > 0 && (
              <CategorySection
                title="Schedule"
                icon={<Clock size={16} color={colors.primaryContainer} />}
                expanded={expandedSections.schedule}
                onToggle={() => toggleSection('schedule')}
                completed={summary?.scheduleCompleted || 0}
                total={todayActivities.scheduleBlocks.length}
              >
                {todayActivities.scheduleBlocks.map((block, i) => (
                  <ActivityChecklistItem
                    key={`block-${block.index}`}
                    activity={block}
                    completed={isCompleted('schedule_block', block.index)}
                    onToggle={() => handleActivityToggle(block)}
                    rowIndex={i}
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
            color={colors.onSurfaceVariant}
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
  rowIndex: number;
}

function ActivityChecklistItem({ activity, completed, onToggle, rowIndex }: ActivityChecklistItemProps) {
  const isEvenRow = rowIndex % 2 === 0;
  return (
    <Pressable
      style={[
        styles.checklistItem,
        { backgroundColor: isEvenRow ? colors.surface : colors.surfaceContainerLow },
      ]}
      onPress={onToggle}
    >
      <View style={[styles.checkbox, completed && styles.checkboxChecked]}>
        {completed && <Check size={14} color={colors.surfaceContainerLowest} strokeWidth={3} />}
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
    backgroundColor: colors.surfaceContainerLowest,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
  },
  emptyContent: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  emptyState: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 20,
  },
  generateButton: {
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
  },
  generateButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onPrimary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.onSurface,
  },
  headerDate: {
    fontSize: 13,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  dropdownWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    maxWidth: 160,
  },
  dropdownButtonText: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.onSurface,
  },
  dropdownMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    minWidth: 200,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownItemSelected: {
    backgroundColor: colors.selectedBg,
  },
  dropdownItemText: {
    fontSize: fontSize.sm,
    color: colors.onSurface,
  },
  dropdownItemTextSelected: {
    color: colors.primaryContainer,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    gap: 12,
  },
  heroCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryContainer,
  },
  progressCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  progressPercentage: {
    fontSize: 56,
    fontWeight: '700',
    color: colors.primaryContainer,
    fontVariant: ['tabular-nums'],
  },
  progressPercentSign: {
    fontSize: fontSize['2xl'],
    fontWeight: '600',
    color: colors.primaryContainer,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  categorySummary: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    gap: spacing.xs,
  },
  categoryChipText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  streakCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  streakContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  streakNumber: {
    fontSize: fontSize['3xl'],
    fontWeight: '700',
    color: colors.onSurface,
    fontVariant: ['tabular-nums'],
  },
  streakLabel: {
    fontSize: fontSize.sm,
    color: colors.onSurfaceVariant,
  },
  bestStreak: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
  },
  section: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
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
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
  },
  sectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  sectionCountComplete: {
    color: colors.primaryContainer,
  },
  sectionContent: {
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: borderRadius.full,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  checklistContent: {
    flex: 1,
  },
  checklistName: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.onSurface,
  },
  checklistNameCompleted: {
    color: colors.onSurfaceVariant,
    textDecorationLine: 'line-through',
  },
  checklistDetails: {
    fontSize: fontSize.xs,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  checklistTime: {
    fontSize: fontSize.xs,
    fontWeight: '500',
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  weeklyCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  weeklyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.onSurface,
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
    gap: spacing.xs,
  },
  barWrapper: {
    width: 24,
    height: 60,
    backgroundColor: colors.surface,
    borderRadius: 0,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    backgroundColor: colors.primaryContainer,
    borderRadius: 0,
    minHeight: 2,
  },
  barToday: {
    backgroundColor: colors.primaryFixed,
  },
  barLabel: {
    fontSize: 10,
    color: colors.onSurfaceVariant,
    fontWeight: '500',
  },
  barLabelToday: {
    color: colors.primaryContainer,
    fontWeight: '600',
  },
  scheduleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    gap: spacing.sm,
    padding: spacing.md,
    overflow: 'hidden',
  },
  scheduleBannerLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.info,
  },
  scheduleBannerText: {
    fontSize: fontSize.xs,
    color: colors.onSurface,
    flex: 1,
    paddingLeft: spacing.xs,
  },
  scheduleBannerDate: {
    color: colors.onSurfaceVariant,
    fontVariant: ['tabular-nums'],
  },
  transitionWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    gap: spacing.sm,
    padding: spacing.md,
    overflow: 'hidden',
  },
  transitionWarningLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.warning,
  },
  transitionWarningText: {
    fontSize: fontSize.xs,
    color: colors.onSurface,
    flex: 1,
    paddingLeft: spacing.xs,
    fontVariant: ['tabular-nums'],
  },
});
