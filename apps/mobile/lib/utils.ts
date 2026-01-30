/**
 * Analyzes partial JSON from protocol modification streaming
 * and returns a user-friendly status message.
 */
export function getStreamingStatus(partialJson: string): string {
  // Check patterns in reverse order of JSON structure (last match wins)

  // Reasoning comes last in the JSON
  if (partialJson.includes('"reasoning"')) {
    return 'Summarizing changes...';
  }

  // Training section
  if (partialJson.includes('"training"')) {
    if (partialJson.includes('"workouts"')) {
      // Try to find the most recent workout name
      const workoutMatches = partialJson.match(/"name":\s*"([^"]+)"/g);
      if (workoutMatches && workoutMatches.length > 0) {
        const lastMatch = workoutMatches[workoutMatches.length - 1];
        const name = lastMatch.match(/"name":\s*"([^"]+)"/)?.[1];
        if (name && name.length < 40) {
          return `Planning ${name}...`;
        }
      }
      return 'Designing workouts...';
    }
    return 'Optimizing training program...';
  }

  // Supplementation section
  if (partialJson.includes('"supplementation"')) {
    return 'Reviewing supplements...';
  }

  // Diet section
  if (partialJson.includes('"diet"')) {
    if (partialJson.includes('"meals"')) {
      return 'Planning meals...';
    }
    return 'Adjusting nutrition plan...';
  }

  // Schedules section - detect schedule labels
  if (partialJson.includes('"schedules"')) {
    const labelMatches = partialJson.match(/"label":\s*"([^"]+)"/g);
    if (labelMatches && labelMatches.length > 0) {
      const lastLabel = labelMatches[labelMatches.length - 1].match(
        /"label":\s*"([^"]+)"/
      )?.[1];
      if (lastLabel) {
        return `Building ${lastLabel}...`;
      }
    }
    return 'Updating daily schedules...';
  }

  return 'Researching your suggestions...';
}
