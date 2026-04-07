import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef } from 'react';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { GeneratingStep } from '@/components/protocol/wizard/GeneratingStep';
import { useSSEStream } from '@/lib/useSSEStream';
import { apiUrl, getAuthHeaders } from '@/lib/api';
import { colors } from '@/lib/theme';
import type { PersonalInfo } from '@protocol/shared/schemas';

interface GenerateResult {
  id: string;
  name: string;
  evaluation: {
    requirements_met: boolean;
    weighted_goal_score: number;
    viability_score: number;
  };
}

export default function GeneratingScreen() {
  const router = useRouter();
  const { goals, requirements, personalInfo, completeOnboarding } = useOnboarding();
  const { streamedText, error, startStream, reset } = useSSEStream<GenerateResult>();
  const hasStarted = useRef(false);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const run = async () => {
      const headers = await getAuthHeaders();

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
        await completeOnboarding();
      }
    };

    run();
  }, []);

  const handleRetry = () => {
    hasStarted.current = false;
    reset();
    // Re-trigger by going back one step and restarting
    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <GeneratingStep
          streamedText={streamedText}
          error={error}
          onRetry={handleRetry}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
});
