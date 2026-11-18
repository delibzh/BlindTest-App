import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  variant?: 'primary' | 'ghost';
  style?: ViewStyle;
}

export function Button({ label, onPress, loading = false, variant = 'primary', style }: Props) {
  return (
    <TouchableOpacity
      style={[styles.base, variant === 'ghost' ? styles.ghost : styles.primary, style]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? Colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.label, variant === 'ghost' && styles.labelGhost]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: Colors.primaryDeep,
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 20,
    elevation: 10,
  },
  ghost: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
  },
  label: { color: '#fff', fontSize: 16, fontWeight: '700' },
  labelGhost: { color: Colors.text },
});
