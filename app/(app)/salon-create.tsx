import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { CategoryCard, CATEGORIES } from '@/components/CategoryCard';
import { Colors } from '@/constants/colors';
import { generateSessionCode } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { loadSounds, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

const COUNTS = [5, 10, 20];

export default function SalonCreateScreen() {
  const { user } = useAuth();
  useEffect(() => { loadSounds(); }, []);
  const [selected, setSelected] = useState<string[]>(['anime', 'games']);
  const [count, setCount] = useState(10);
  const [scoringMode, setScoringMode] = useState<'auto' | 'manuel'>('auto');
  const [creating, setCreating] = useState(false);

  function toggleCategory(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((c) => c !== id) : prev) : [...prev, id]
    );
  }

  async function handleCreate() {
    if (!user) return;
    setCreating(true);
    const sessionId = generateSessionCode();

    try {
      await fetch(`${process.env.EXPO_PUBLIC_SERVER_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, hostId: user.id, universe: selected.join(','), maxPlayers: 8, trackCount: count }),
      });
    } catch { /* serveur pas encore déployé */ }

    router.replace({
      pathname: '/(app)/salon-lobby',
      params: { sessionId, isGm: 'true', categories: selected.join(','), count: String(count), scoringMode },
    });
  }

  return (
    <MeshBackground>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => { playPrevious(); router.back(); }} style={styles.back}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Créer un salon</Text>

      <Text style={styles.section}>Catégories</Text>
      <View style={styles.grid}>
        {CATEGORIES.map((cat) => (
          <CategoryCard key={cat.id} category={cat} selected={selected.includes(cat.id)} onPress={() => toggleCategory(cat.id)} />
        ))}
      </View>

      <Text style={styles.section}>Nombre de sons</Text>
      <View style={styles.countRow}>
        {COUNTS.map((c) => (
          <TouchableOpacity key={c} style={[styles.countBtn, count === c && styles.countBtnActive]} onPress={() => setCount(c)}>
            <Text style={[styles.countText, count === c && styles.countTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.section}>Mode de scoring</Text>
      <View style={styles.scoringRow}>
        {(['auto', 'manuel'] as const).map((mode) => (
          <TouchableOpacity key={mode} style={[styles.scoringBtn, scoringMode === mode && styles.scoringBtnActive]} onPress={() => setScoringMode(mode)}>
            <Text style={[styles.scoringTitle, scoringMode === mode && styles.scoringTitleActive]}>
              {mode === 'auto' ? '⚡ Automatique' : '✋ Manuel'}
            </Text>
            <Text style={styles.scoringDesc}>
              {mode === 'auto' ? 'Points selon rapidité' : 'Tu valides chaque réponse'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
        {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Créer le salon →</Text>}
      </TouchableOpacity>
    </ScrollView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 56, gap: 18 },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },
  section: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  countRow: { flexDirection: 'row', gap: 12 },
  countBtn: { flex: 1, height: 52, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surface },
  countBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '22' },
  countText: { color: Colors.textMuted, fontSize: 18, fontWeight: '700' },
  countTextActive: { color: Colors.primary },
  scoringRow: { gap: 10 },
  scoringBtn: { padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface, gap: 4 },
  scoringBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  scoringTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  scoringTitleActive: { color: Colors.primary },
  scoringDesc: { color: Colors.textMuted, fontSize: 13 },
  createBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
