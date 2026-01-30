import { View, StyleSheet, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { isAppleSignInAvailable } from '@/lib/auth/apple';
import { borderRadius } from '@/lib/theme';

export function AppleSignInButton() {
  const [loading, setLoading] = useState(false);
  const { signInWithApple } = useAuth();

  // Only render on iOS
  if (!isAppleSignInAvailable()) {
    return null;
  }

  const handlePress = async () => {
    if (loading) return;
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
        cornerRadius={borderRadius.md}
        style={styles.button}
        onPress={handlePress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    height: 50,
    width: '100%',
  },
});
