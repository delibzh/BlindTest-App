import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { CATEGORIES } from '@/components/CategoryCard';
import { Colors } from '@/constants/colors';

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

export function CategoryPicker({ selected, onToggle }: Props) {
  return (
    <View style={styles.wrap}>
      {CATEGORIES.map((cat) => {
        const active = selected.includes(cat.id);
        return (
          <TouchableOpacity
            key={cat.id}
            style={[
              styles.pill,
              active
                ? { backgroundColor: cat.color + '28', borderColor: cat.color }
                : { backgroundColor: Colors.surface, borderColor: Colors.border },
            ]}
            onPress={() => onToggle(cat.id)}
            activeOpacity={0.7}
          >
            {cat.image
              ? <Image source={cat.image} style={styles.pillImg} resizeMode="contain" />
              : <Text style={styles.pillEmoji}>{cat.emoji}</Text>
            }
            <Text style={[styles.pillLabel, active && { color: cat.color }]}>
              {cat.label}
            </Text>
            {active && <View style={[styles.check, { backgroundColor: cat.color }]}><Text style={styles.checkText}>✓</Text></View>}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillEmoji: { fontSize: 16 },
  pillImg: { width: 18, height: 18 },
  pillLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' },
  check: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  checkText: { color: '#fff', fontSize: 9, fontWeight: '900' },
});
