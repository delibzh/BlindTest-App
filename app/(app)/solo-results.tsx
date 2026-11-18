import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';

export default function SoloResultsScreen() {
  const { score, correct, total } = useLocalSearchParams<{ score: string; correct: string; total: string }>();
  const pct = Math.round((Number(correct) / Number(total)) * 100);

  const emoji = pct >= 50 ? (pct >= 80 ? null : '😎') : null;
  const emojiImg = pct >= 80
    ? require('@/assets/Icon/UI/trophy.png')
    : pct < 50
    ? require('@/assets/Icon/UI/death.png')
    : null;

  return (
    <MeshBackground>
    <View style={styles.container}>
      {emojiImg
        ? <Image source={emojiImg} style={styles.emojiImg} />
        : <Text style={styles.emoji}>{emoji}</Text>
      }
      <Text style={styles.title}>{pct >= 80 ? 'Excellent !' : pct >= 50 ? 'Pas mal !' : 'Aïe...'}</Text>

      <View style={styles.card}>
        <Row label="Score" value={`${score} pts`} highlight />
        <Row label="Bonnes réponses" value={`${correct} / ${total}`} />
        <Row label="Précision" value={`${pct}%`} />
      </View>

      <View style={styles.actions}>
        <Button label="Rejouer" onPress={() => router.replace('/(app)/solo-setup')} />
        <Button label="Classement" onPress={() => router.push('/(app)/leaderboard')} variant="ghost" />
        <Button label="Accueil" onPress={() => router.replace('/(app)/home')} variant="ghost" />
      </View>
    </View>
    </MeshBackground>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, highlight && { color: Colors.primary, fontSize: 22 }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, alignItems: 'center', justifyContent: 'center', gap: 24 },
  emoji: { fontSize: 80 },
  emojiImg: { width: 80, height: 80 },
  title: { color: Colors.text, fontSize: 32, fontWeight: '800' },
  card: { width: '100%', backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, padding: 20, gap: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { color: Colors.textMuted, fontSize: 15 },
  rowValue: { color: Colors.text, fontSize: 18, fontWeight: '700' },
  actions: { width: '100%', gap: 12 },
});
