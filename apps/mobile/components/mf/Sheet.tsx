import { Modal, View, Text, Pressable, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { mf, fonts } from '@/lib/theme';

type Props = {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'modal' | 'full';
  scrollable?: boolean;
};

export function Sheet({ visible, title, onClose, children, footer, variant = 'modal', scrollable = true }: Props) {
  const insets = useSafeAreaInsets();
  const maxHeightPct = variant === 'full' ? 0.96 : 0.88;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(5, 12, 8, 0.72)' }} onPress={onClose}>
        <View style={{ flex: 1 }} />
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            maxHeight: `${maxHeightPct * 100}%` as any,
            backgroundColor: mf.bg,
            borderTopWidth: 1,
            borderColor: mf.line2,
          }}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 16,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: mf.line,
              }}
            >
              <Text
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 11,
                  letterSpacing: 1.2,
                  textTransform: 'uppercase',
                  color: mf.fg,
                }}
              >
                {title}
              </Text>
              <Pressable
                onPress={onClose}
                hitSlop={8}
                style={{ borderWidth: 1, borderColor: mf.line2, padding: 6 }}
              >
                <X size={12} color={mf.fg2} />
              </Pressable>
            </View>
            {scrollable ? (
              <ScrollView
                keyboardShouldPersistTaps="handled"
                style={{ maxHeight: '100%' }}
                contentContainerStyle={{ paddingBottom: footer ? 0 : insets.bottom + 16 }}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={{ flexShrink: 1 }}>{children}</View>
            )}
            {footer ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: mf.line,
                  backgroundColor: mf.bg2,
                  paddingHorizontal: 16,
                  paddingTop: 10,
                  paddingBottom: Math.max(insets.bottom, 16),
                }}
              >
                {footer}
              </View>
            ) : null}
          </KeyboardAvoidingView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
