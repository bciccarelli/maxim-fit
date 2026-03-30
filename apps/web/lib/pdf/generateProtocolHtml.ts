import type {
  DailyProtocol,
  DietPlan,
  Meal,
  SupplementationPlan,
  TrainingProgram,
  Workout,
  Exercise,
  DayOfWeek,
} from '@protocol/shared/schemas/protocol';
import { computeScheduleEvents, type ScheduleEvent } from '@protocol/shared';

export interface ProtocolMetadata {
  name: string | null;
  weighted_goal_score: number | null;
  viability_score: number | null;
  verified: boolean;
}

// Forest green palette matching web CSS variables
const colors = {
  background: '#fafaf5',
  card: '#ffffff',
  text: '#1a2e1a',
  textSecondary: '#666666',
  textMuted: '#999999',
  primary: '#2d5e2d',
  primaryDark: '#1a3a1a',
  success: '#16a34a',
  border: '#e0e0e0',
  borderLight: '#f0f0f0',
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDays(days: string[]): string {
  const dayAbbrevs: Record<string, string> = {
    monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
    thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
  };
  return days.map((d) => dayAbbrevs[d] || d).join(', ');
}

function getSourceIcon(source: ScheduleEvent['source']): string {
  switch (source) {
    case 'meal': return '&#127869;';
    case 'supplement': return '&#128138;';
    case 'workout': return '&#127947;';
    case 'routine': return '&#128260;';
    case 'other': return '&#9200;';
  }
}

function buildScheduleHtml(protocol: DailyProtocol): string {
  return protocol.schedules.map((variant, index) => {
    const firstDay = variant.days[0] as DayOfWeek;
    const events = computeScheduleEvents(protocol, firstDay);
    return `
      <div class="card">
        <div class="card-header">
          <span class="section-label">${escapeHtml(variant.label || `Schedule ${index + 1}`)}</span>
          <span class="days-badge">${formatDays(variant.days)}</span>
        </div>
        <div class="time-range">
          <span class="mono">${variant.wake_time}</span>
          <span class="separator"> &ndash; </span>
          <span class="mono">${variant.sleep_time}</span>
        </div>
        <div class="timeline">
          ${events.map((e) => `
            <div class="timeline-item">
              <span class="time mono">${e.start_time} &ndash; ${e.end_time}</span>
              <span class="activity">${getSourceIcon(e.source)} ${escapeHtml(e.activity)}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function buildMealHtml(meal: Meal): string {
  return `
    <div class="meal-item">
      <div class="meal-header">
        <span class="meal-time mono">${meal.time}</span>
        <span class="meal-name">${escapeHtml(meal.name)}</span>
        <span class="meal-cals mono">${meal.calories} kcal</span>
      </div>
      <div class="meal-macros mono">P ${meal.protein_g}g &middot; C ${meal.carbs_g}g &middot; F ${meal.fat_g}g</div>
      ${meal.foods.length > 0 ? `<div class="meal-foods">${meal.foods.map(escapeHtml).join(', ')}</div>` : ''}
    </div>
  `;
}

function buildDietHtml(diet: DietPlan): string {
  return `
    <div class="card">
      <div class="section-label">DIET</div>
      <div class="macro-summary">
        <div class="macro-item"><span class="macro-value mono">${diet.daily_calories.toLocaleString()}</span><span class="macro-label">KCAL</span></div>
        <div class="macro-item"><span class="macro-value mono">${diet.protein_target_g}</span><span class="macro-label">PROTEIN (G)</span></div>
        <div class="macro-item"><span class="macro-value mono">${diet.carbs_target_g}</span><span class="macro-label">CARBS (G)</span></div>
        <div class="macro-item"><span class="macro-value mono">${diet.fat_target_g}</span><span class="macro-label">FAT (G)</span></div>
        <div class="macro-item"><span class="macro-value mono">${diet.hydration_oz}</span><span class="macro-label">WATER (OZ)</span></div>
      </div>
      <div class="meals-list">${diet.meals.map(buildMealHtml).join('')}</div>
      ${diet.dietary_notes.length > 0 ? `
        <div class="notes-section">
          <span class="notes-label">Notes</span>
          <ul class="notes-list">${diet.dietary_notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `;
}

function buildSupplementsHtml(supplementation: SupplementationPlan): string {
  return `
    <div class="card">
      <div class="section-label">SUPPLEMENTS</div>
      <div class="supplements-list">
        ${supplementation.supplements.map((supp) => {
          const dosage = `${supp.dosage_amount} ${supp.dosage_unit}${supp.dosage_notes ? ` (${supp.dosage_notes})` : ''}`;
          return `
            <div class="supplement-item">
              <div class="supp-header">
                <span class="supp-name">${escapeHtml(supp.name)}</span>
                <span class="supp-dosage mono">${escapeHtml(dosage)}</span>
              </div>
              <div class="supp-details">
                <span class="supp-timing">${escapeHtml(supp.timing)}</span>
                <span class="supp-purpose">${escapeHtml(supp.purpose)}</span>
              </div>
              ${supp.notes ? `<div class="supp-notes">${escapeHtml(supp.notes)}</div>` : ''}
            </div>
          `;
        }).join('')}
      </div>
      ${supplementation.general_notes.length > 0 ? `
        <div class="notes-section">
          <span class="notes-label">Notes</span>
          <ul class="notes-list">${supplementation.general_notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `;
}

function buildExerciseHtml(exercise: Exercise): string {
  let setsReps = '';
  if (exercise.sets && exercise.reps) {
    setsReps = `${exercise.sets} &times; ${exercise.reps}`;
  } else if (exercise.duration_min) {
    setsReps = `${exercise.duration_min} min`;
  }
  return `
    <div class="exercise-item">
      <span class="exercise-name">${escapeHtml(exercise.name)}</span>
      <span class="exercise-sets mono">${setsReps}</span>
    </div>
  `;
}

function buildWorkoutHtml(workout: Workout): string {
  return `
    <div class="workout-card">
      <div class="workout-header">
        <span class="workout-name">${escapeHtml(workout.name)}</span>
        <span class="workout-meta mono">${escapeHtml(workout.day)} &middot; ${workout.duration_min} min</span>
      </div>
      <div class="exercises-list">${workout.exercises.map(buildExerciseHtml).join('')}</div>
    </div>
  `;
}

function buildTrainingHtml(training: TrainingProgram): string {
  return `
    <div class="card">
      <div class="section-label">TRAINING</div>
      <div class="training-header">
        <span class="program-name">${escapeHtml(training.program_name)}</span>
        <span class="program-meta mono">${training.days_per_week} days/week</span>
      </div>
      <div class="workouts-list">${training.workouts.map(buildWorkoutHtml).join('')}</div>
      ${training.rest_days.length > 0 ? `<div class="rest-days"><span class="rest-label">Rest days:</span> ${training.rest_days.map(escapeHtml).join(', ')}</div>` : ''}
      ${training.progression_notes ? `<div class="progression"><span class="notes-label">Progression:</span> ${escapeHtml(training.progression_notes)}</div>` : ''}
      ${training.general_notes.length > 0 ? `
        <div class="notes-section">
          <span class="notes-label">Notes</span>
          <ul class="notes-list">${training.general_notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `;
}

export function generateProtocolHtml(protocol: DailyProtocol, metadata: ProtocolMetadata): string {
  const protocolName = metadata.name || 'My Protocol';
  const generatedDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.background}; color: ${colors.text};
      padding: 24px; line-height: 1.5; font-size: 12px;
    }
    .mono { font-family: 'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
    .header { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid ${colors.primary}; }
    .protocol-name { font-size: 24px; font-weight: 700; color: ${colors.primaryDark}; margin-bottom: 12px; }
    .scores-row { display: flex; gap: 24px; }
    .score-item { text-align: center; }
    .score-value { font-size: 20px; font-weight: 600; color: ${colors.primary}; }
    .score-label { font-size: 9px; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; }
    .verified-badge { color: ${colors.success}; }
    .unverified-badge { color: ${colors.textMuted}; }
    .card { background: ${colors.card}; border-radius: 8px; padding: 16px; margin-bottom: 16px; border-left: 3px solid ${colors.primary}; }
    .card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
    .section-label { font-size: 10px; font-weight: 600; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
    .days-badge { font-size: 10px; color: ${colors.textSecondary}; }
    .time-range { font-size: 14px; margin-bottom: 12px; color: ${colors.textSecondary}; }
    .separator { margin: 0 4px; }
    .timeline { border-top: 1px solid ${colors.border}; padding-top: 8px; }
    .timeline-item { display: flex; padding: 6px 0; border-bottom: 1px solid ${colors.borderLight}; }
    .timeline-item:last-child { border-bottom: none; }
    .time { width: 100px; color: ${colors.textSecondary}; font-size: 11px; }
    .activity { flex: 1; }
    .macro-summary { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 16px; padding: 12px; background: ${colors.background}; border-radius: 6px; }
    .macro-item { text-align: center; min-width: 60px; }
    .macro-value { font-size: 18px; font-weight: 600; color: ${colors.primary}; display: block; }
    .macro-label { font-size: 8px; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; }
    .meals-list { border-top: 1px solid ${colors.border}; }
    .meal-item { padding: 10px 0; border-bottom: 1px solid ${colors.borderLight}; }
    .meal-item:last-child { border-bottom: none; }
    .meal-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 4px; }
    .meal-time { font-size: 11px; color: ${colors.textSecondary}; }
    .meal-name { font-weight: 500; flex: 1; }
    .meal-cals { font-size: 11px; color: ${colors.textSecondary}; }
    .meal-macros { font-size: 10px; color: ${colors.textSecondary}; margin-bottom: 4px; }
    .meal-foods { font-size: 11px; color: ${colors.textSecondary}; }
    .supplements-list { border-top: 1px solid ${colors.border}; }
    .supplement-item { padding: 10px 0; border-bottom: 1px solid ${colors.borderLight}; }
    .supplement-item:last-child { border-bottom: none; }
    .supp-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .supp-name { font-weight: 500; }
    .supp-dosage { font-size: 11px; color: ${colors.primary}; }
    .supp-details { font-size: 11px; color: ${colors.textSecondary}; }
    .supp-timing { margin-right: 8px; }
    .supp-notes { font-size: 10px; color: ${colors.textMuted}; margin-top: 4px; font-style: italic; }
    .training-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 12px; }
    .program-name { font-weight: 600; font-size: 14px; }
    .program-meta { font-size: 11px; color: ${colors.textSecondary}; }
    .workouts-list { border-top: 1px solid ${colors.border}; }
    .workout-card { padding: 12px 0; border-bottom: 1px solid ${colors.borderLight}; }
    .workout-card:last-child { border-bottom: none; }
    .workout-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .workout-name { font-weight: 500; }
    .workout-meta { font-size: 10px; color: ${colors.textSecondary}; }
    .exercises-list { margin: 8px 0; }
    .exercise-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 11px; }
    .exercise-name { color: ${colors.text}; }
    .exercise-sets { color: ${colors.textSecondary}; }
    .rest-days { font-size: 11px; color: ${colors.textSecondary}; margin-top: 8px; }
    .rest-label { font-weight: 500; }
    .progression { font-size: 11px; color: ${colors.textSecondary}; margin-top: 8px; }
    .notes-section { margin-top: 12px; padding-top: 8px; border-top: 1px solid ${colors.borderLight}; }
    .notes-label { font-size: 10px; font-weight: 500; color: ${colors.textSecondary}; text-transform: uppercase; letter-spacing: 0.5px; }
    .notes-list { margin-top: 6px; padding-left: 16px; font-size: 11px; color: ${colors.textSecondary}; }
    .notes-list li { margin-bottom: 4px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid ${colors.border}; font-size: 10px; color: ${colors.textMuted}; text-align: center; }
    @media print { body { padding: 12px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="protocol-name">${escapeHtml(protocolName)}</div>
    <div class="scores-row">
      ${metadata.weighted_goal_score !== null ? `
        <div class="score-item">
          <div class="score-value mono">${metadata.weighted_goal_score.toFixed(1)}</div>
          <div class="score-label">Goal Score</div>
        </div>
      ` : ''}
      ${metadata.viability_score !== null ? `
        <div class="score-item">
          <div class="score-value mono">${metadata.viability_score.toFixed(1)}</div>
          <div class="score-label">Viability</div>
        </div>
      ` : ''}
      <div class="score-item">
        <div class="score-value ${metadata.verified ? 'verified-badge' : 'unverified-badge'}">
          ${metadata.verified ? '&#10003;' : '&#9675;'}
        </div>
        <div class="score-label">${metadata.verified ? 'Verified' : 'Unverified'}</div>
      </div>
    </div>
  </div>

  <div class="section-label">SCHEDULE</div>
  ${buildScheduleHtml(protocol)}
  ${buildDietHtml(protocol.diet)}
  ${buildSupplementsHtml(protocol.supplementation)}
  ${buildTrainingHtml(protocol.training)}

  <div class="footer">Generated on ${generatedDate} &middot; Maxim Fit</div>
</body>
</html>`;
}
