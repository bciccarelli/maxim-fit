import { View, StyleSheet } from 'react-native';
import { GoogleSignInButton } from './GoogleSignInButton';
import { AppleSignInButton } from './AppleSignInButton';
import { spacing } from '@/lib/theme';

export function SocialSignInButtons() {
  return (
    <View style={styles.container}>
      <GoogleSignInButton />
      <AppleSignInButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
});
