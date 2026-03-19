import { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  type TextStyle,
  type StyleProp,
  type KeyboardTypeOptions,
} from 'react-native';
import { KEYBOARD_ACCESSORY_ID } from '@/components/shared/KeyboardAccessoryProvider';
import { colors, spacing, borderRadius, fontSize } from '@/lib/theme';

interface EditableFieldProps {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'time';
  editable?: boolean;
  style?: StyleProp<TextStyle>;
  mono?: boolean;
  placeholder?: string;
  multiline?: boolean;
}

export function EditableField({
  value,
  onChange,
  type = 'text',
  editable = true,
  style,
  mono = false,
  placeholder,
  multiline = false,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const handlePress = () => {
    if (editable) {
      setEditing(true);
    }
  };

  const handleTextChange = (text: string) => {
    setDraft(text);
    onChange(text);
  };

  const handleBlur = () => {
    setEditing(false);
  };

  const handleSubmit = () => {
    setEditing(false);
  };

  const getKeyboardType = (): KeyboardTypeOptions => {
    switch (type) {
      case 'number':
        return 'numeric';
      case 'time':
        return 'numbers-and-punctuation';
      default:
        return 'default';
    }
  };

  const textStyle: StyleProp<TextStyle> = [
    styles.text,
    mono && styles.mono,
    style,
  ];

  if (!editing) {
    return (
      <Pressable onPress={handlePress} style={styles.pressable}>
        <Text style={[textStyle, !value && styles.placeholder]}>
          {value || placeholder || '—'}
        </Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.inputContainer}>
      <TextInput
        ref={inputRef}
        value={draft}
        onChangeText={handleTextChange}
        onBlur={handleBlur}
        onSubmitEditing={handleSubmit}
        keyboardType={getKeyboardType()}
        style={[styles.input, mono && styles.mono, style]}
        placeholder={placeholder}
        placeholderTextColor={colors.onSurfaceVariant}
        multiline={multiline}
        blurOnSubmit={!multiline}
        returnKeyType={multiline ? 'default' : 'done'}
        inputAccessoryViewID={Platform.OS === 'ios' ? KEYBOARD_ACCESSORY_ID : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  pressable: {
    minHeight: 24,
    justifyContent: 'center',
  },
  text: {
    fontSize: 14,
    color: colors.onSurface,
  },
  placeholder: {
    color: colors.onSurfaceVariant,
  },
  mono: {
    fontVariant: ['tabular-nums'],
  },
  inputContainer: {
    marginVertical: -4,
  },
  input: {
    fontSize: 14,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.primaryContainer,
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceContainerLowest,
    minHeight: 32,
  },
});
