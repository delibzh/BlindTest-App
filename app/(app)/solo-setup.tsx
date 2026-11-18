import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { CategoryCard, CATEGORIES } from '@/components/CategoryCard';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { loadSounds, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

const COUNTS = [5, 10, 20];

export default function SoloSetupScreen() {
  const [selected, setSelected] = useState<string[]>(['anime', 'games']);
  const [count, setCount] = useState(10);
  useEffect(() => { loadSounds(); }, []);

  function toggleCategory(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((c) => c !== id) : prev) : [...prev, id]
    );
  }

  function handlePlay() {
    router.push({ pathname: '/(app)/solo-game', params: { categories: selected.join(','), count: String(count) } });
  }

  return (
    <MeshBackground>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => { playPrevious(); router.back(); }} style={styles.back}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Mode Solo 🎯</Text>
      <Text style={styles.subtitle}>Choisis tes catégories</Text>

      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            selected={selected.includes(cat.id)}
            onPress={() => toggleCategory(cat.id)}
          />
        ))}
      </View>

      <Text style={styles.subtitle}>Nombre de sons</Text>
      <View style={styles.countRow}>
        {COUNTS.map((c) => (
          <TouchableOpacity
            key={c}
            style={[styles.countBtn, count === c && styles.countBtnActive]}
            onPress={() => setCount(c)}
          >
            <Text style={[styles.countText, count === c && styles.countTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Button label={`Jouer · ${count} sons`} onPress={handlePlay} style={styles.playBtn} />
    </ScrollView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 56, gap: 20 },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  subtitle: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  countRow: { flexDirection: 'row', gap: 12 },
  countBtn: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  countBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  countText: { color: Colors.textMuted, fontSize: 18, fontWeight: '700' },
  countTextActive: { color: Colors.primary },
  playBtn: { marginBottom: 20 },
});
