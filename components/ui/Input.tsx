import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
}

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={styles.wrapper}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError, style]}
        placeholderTextColor={Colors.textMuted}
        {...props}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: { color: Colors.textMuted, fontSize: 13, fontWeight: '500' },
  input: {
    height: 52,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    color: Colors.text,
    fontSize: 15,
  },
  inputError: { borderColor: Colors.error },
  error: { color: Colors.error, fontSize: 12 },
});
