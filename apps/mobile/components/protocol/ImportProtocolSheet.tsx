import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useState, useCallback } from 'react';
import { X, Upload, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { fetchApi } from '@/lib/api';

type ImportState = 'idle' | 'loading' | 'success' | 'error';

interface ImportProtocolSheetProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (protocolId: string) => void;
}

const PLACEHOLDER_TEXT = `Paste your protocol text here...

Example:
Wake up at 6am. Morning workout: 30 min cardio followed by strength training (3x10 squats, 3x10 bench press).

Breakfast at 8am: oatmeal with berries (400 cal).
Lunch at 12pm: chicken salad (600 cal).
Dinner at 6pm: salmon with vegetables (700 cal).

Supplements: Vitamin D 2000IU morning, Omega-3 1g with meals.

Sleep by 10pm.`;

export function ImportProtocolSheet({
  visible,
  onClose,
  onComplete,
}: ImportProtocolSheetProps) {
  const [state, setState] = useState<ImportState>('idle');
  const [pasteText, setPasteText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!pasteText.trim()) {
      setError('Please paste some text to parse');
      setState('error');
      return;
    }

    setState('loading');
    setError(null);

    try {
      const result = await fetchApi<{ id: string }>('/api/protocol/parse', {
        method: 'POST',
        body: JSON.stringify({ text: pasteText }),
      });

      setState('success');

      // Brief delay to show success state before closing
      setTimeout(() => {
        onComplete(result.id);
        handleClose();
      }, 1500);
    } catch (err) {
      setState('error');
      setError(err instanceof Error ? err.message : 'Failed to parse protocol');
    }
  }, [pasteText, onComplete]);

  const handleClose = useCallback(() => {
    setState('idle');
    setPasteText('');
    setError(null);
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    setState('idle');
    setError(null);
  }, []);

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
          <Pressable onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#666" />
          </Pressable>
          <Text style={styles.title}>Import Protocol</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {state === 'idle' && (
            <>
              <View style={styles.infoCard}>
                <Sparkles size={20} color="#2d5a2d" />
                <Text style={styles.infoText}>
                  AI will parse your text into a structured protocol with inferred goals
                </Text>
              </View>

              <TextInput
                style={styles.input}
                value={pasteText}
                onChangeText={setPasteText}
                placeholder={PLACEHOLDER_TEXT}
                placeholderTextColor="#999"
                multiline
                textAlignVertical="top"
              />

              <Text style={styles.hint}>
                Include details about schedule, diet, supplements, and training
              </Text>

              <Pressable
                style={[
                  styles.submitButton,
                  !pasteText.trim() && styles.submitButtonDisabled,
                ]}
                onPress={handleSubmit}
                disabled={!pasteText.trim()}
              >
                <Sparkles size={20} color="#fff" />
                <Text style={styles.submitButtonText}>Parse with AI</Text>
              </Pressable>
            </>
          )}

          {state === 'loading' && (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color="#2d5a2d" />
              <Text style={styles.loadingTitle}>Parsing and verifying...</Text>
              <Text style={styles.loadingSubtitle}>
                Extracting protocol structure, inferring goals, and verifying with current evidence
              </Text>
            </View>
          )}

          {state === 'success' && (
            <View style={styles.centerContainer}>
              <CheckCircle2 size={48} color="#2d5a2d" />
              <Text style={styles.successTitle}>Protocol imported!</Text>
              <Text style={styles.successSubtitle}>
                Redirecting to your protocol...
              </Text>
            </View>
          )}

          {state === 'error' && (
            <View style={styles.errorContainer}>
              <AlertCircle size={48} color="#c62828" />
              <Text style={styles.errorTitle}>Import failed</Text>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={handleRetry}>
                <Text style={styles.retryButtonText}>Try again</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  closeButton: {
    padding: 4,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a2e1a',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
    flexGrow: 1,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#2d5a2d',
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: '#333',
    minHeight: 200,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2d5a2d',
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  loadingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2e1a',
    marginTop: 16,
  },
  loadingSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a2e1a',
    marginTop: 16,
  },
  successSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#c62828',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  retryButton: {
    marginTop: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d5a2d',
  },
});
