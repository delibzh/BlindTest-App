import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  label: string;
  color?: string;
  style?: ViewStyle;
}

export function Badge({ label, color = Colors.primary, style }: Props) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '22', borderColor: color + '55' }, style]}>
      <Text style={[styles.label, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
});
