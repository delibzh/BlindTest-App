import { TouchableOpacity, Text, View, StyleSheet, Image } from 'react-native';
import { Colors } from '@/constants/colors';

export interface Mode {
  id: string;
  label: string;
  description: string;
  emoji: string;
  image?: ReturnType<typeof require>;
  isPremium: boolean;
  color: string;
}

export const MODES: Mode[] = [
  { id: 'defi',   label: 'Défi',   description: 'Tape le bon titre · 3 niveaux à débloquer',   emoji: '🎯', image: require('@/assets/Icon/UI/defi.png'),   isPremium: false, color: Colors.primary },
  { id: 'soiree', label: 'Soirée', description: 'Confiance · Buzz · Chrono configurable',        emoji: '🎤', image: require('@/assets/Icon/UI/soiree.png'), isPremium: false, color: '#f59e0b' },
  { id: 'infini', label: 'Infini', description: '1 vie · streak sans limite · record à battre', emoji: '♾️', image: require('@/assets/Icon/UI/infini.png'), isPremium: false, color: Colors.secondary },
];

interface Props {
  mode: Mode;
  onPress: () => void;
}

export function ModeCard({ mode, onPress }: Props) {
  return (
    <TouchableOpacity style={[styles.card, { borderColor: mode.color + '44' }]} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.iconWrap, { backgroundColor: mode.color + '22' }]}>
        {mode.image
          ? <Image source={mode.image} style={styles.modeImage} resizeMode="contain" />
          : <Text style={styles.emoji}>{mode.emoji}</Text>
        }
      </View>
      <View style={styles.info}>
        <View style={styles.row}>
          <Text style={styles.label}>{mode.label}</Text>
          {mode.isPremium && <Text style={styles.premiumBadge}>PREMIUM</Text>}
        </View>
        <Text style={styles.description}>{mode.description}</Text>
      </View>
      <Text style={styles.arrow}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 26 },
  modeImage: { width: 32, height: 32 },
  info: { flex: 1, gap: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: Colors.text, fontSize: 16, fontWeight: '700' },
  premiumBadge: { color: Colors.tertiary, fontSize: 9, fontWeight: '800', letterSpacing: 1, backgroundColor: Colors.tertiary + '22', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  description: { color: Colors.textMuted, fontSize: 13 },
  arrow: { color: Colors.textMuted, fontSize: 22 },
});
