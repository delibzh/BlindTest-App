import { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { BottomNav } from '@/components/ui/BottomNav';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

const SUB_MODES = [
  {
    id: 'confiance',
    label: 'Confiance',
    emoji: '🤝',
    image: require('@/assets/Icon/UI/trust.png') as ReturnType<typeof require>,
    color: '#f59e0b',
    description: "Réponses à l'oral — l'hôte valide qui a répondu en premier",
    detail: 'Un seul téléphone · Pas de buzz · Confiance mutuelle',
    isPremium: false,
  },
  {
    id: 'buzz',
    label: 'Buzz',
    emoji: '⚡',
    image: require('@/assets/Icon/UI/buzzer.png') as ReturnType<typeof require>,
    color: Colors.primary,
    description: 'Un seul téléphone au centre de la table — le premier qui buzze répond',
    detail: 'Bonne réponse +1 pt · Mauvaise réponse −3 pts',
    isPremium: false,
  },
  {
    id: 'salon',
    label: 'Salon en ligne',
    emoji: '🌐',
    image: null,
    color: Colors.tertiary,
    description: "Chaque joueur sur son écran — buzz simultané sur tous les téléphones",
    detail: 'Multijoueur temps réel · Bonne réponse +1 · Mauvaise −3',
    isPremium: true,
  },
];

export default function SoireeMenuScreen() {
  const insets = useSafeAreaInsets();
  useEffect(() => { loadSounds(); }, []);

  function handleSelect(id: string) {
    playClick();
    if (id === 'confiance') router.push('/(app)/soiree-setup');
    else if (id === 'buzz') router.push('/(app)/buzz-setup');
    else if (id === 'salon') router.push('/(app)/salon');
  }

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Mode Soirée</Text>
          <Text style={styles.subtitle}>Jouez ensemble</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        <Text style={styles.sectionLabel}>CHOISIS TON FORMAT</Text>

        {SUB_MODES.map((mode) => (
          <TouchableOpacity
            key={mode.id}
            style={[styles.card, { borderColor: mode.color + '44' }]}
            onPress={() => handleSelect(mode.id)}
            activeOpacity={0.8}
          >
            {/* Left icon */}
            <View style={[styles.iconWrap, { backgroundColor: mode.color + '25' }]}>
              {mode.image
                ? <Image source={mode.image} style={styles.modeImg} resizeMode="contain" />
                : <Text style={styles.emoji}>{mode.emoji}</Text>
              }
            </View>

            {/* Content */}
            <View style={styles.cardInfo}>
              <View style={styles.cardRow}>
                <Text style={[styles.cardLabel, { color: mode.color }]}>{mode.label}</Text>
                {mode.isPremium && (
                  <View style={[styles.premiumPill, { borderColor: Colors.tertiary + '66', backgroundColor: Colors.tertiary + '18' }]}>
                    <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.premiumPillIcon} resizeMode="contain" />
                    <Text style={[styles.premiumPillText, { color: Colors.tertiary }]}>PREMIUM</Text>
                  </View>
                )}
              </View>
              <Text style={styles.cardDescription}>{mode.description}</Text>
              <Text style={styles.cardDetail}>{mode.detail}</Text>
            </View>

            <Text style={[styles.arrow, { color: mode.color + 'AA' }]}>›</Text>
          </TouchableOpacity>
        ))}

      </ScrollView>
      <BottomNav />
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.primary, fontSize: 22 },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { color: Colors.text, fontSize: 20, fontWeight: '900', letterSpacing: -0.3 },
  subtitle: { color: Colors.textMuted, fontSize: 12 },

  container: { padding: 16, paddingBottom: 110, gap: 12 },
  sectionLabel: {
    color: Colors.outline,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    paddingHorizontal: 4,
    marginBottom: 4,
  },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 14,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  emoji: { fontSize: 28 },
  modeImg: { width: 32, height: 32 },
  cardInfo: { flex: 1, gap: 5 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  cardLabel: { fontSize: 17, fontWeight: '800' },
  premiumPill: {
    borderRadius: 9999,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  premiumPillIcon: { width: 10, height: 10 },
  premiumPillText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5 },
  cardDescription: { color: Colors.textMuted, fontSize: 13, lineHeight: 18 },
  cardDetail: { color: Colors.outline, fontSize: 12, fontStyle: 'italic' },
  arrow: { fontSize: 24 },
});
