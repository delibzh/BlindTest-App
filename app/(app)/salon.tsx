import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { PremiumGate } from '@/components/ui/PremiumGate';
import { usePremium } from '@/hooks/usePremium';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

export default function SalonHubScreen() {
  const insets = useSafeAreaInsets();
  const { premium, loading } = usePremium();
  const [code, setCode] = useState('');
  const [tab, setTab] = useState<'create' | 'join'>('create');
  useEffect(() => { loadSounds(); }, []);

  function handleJoin() {
    const trimmed = code.trim().toUpperCase();
    if (trimmed.length < 4) return;
    playClick();
    router.push({ pathname: '/(app)/salon-lobby', params: { sessionId: trimmed, isGm: 'false' } });
  }

  if (!loading && !premium) {
    return (
      <MeshBackground>
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Salon en ligne</Text>
            <Text style={styles.subtitle}>Jusqu'à 8 joueurs en temps réel</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>
        <PremiumGate
          title="Salon en ligne Premium"
          description="Joue en temps réel avec jusqu'à 8 joueurs, chacun sur son propre téléphone."
          perks={[
            'Créer et rejoindre un salon',
            "Jusqu'à 8 joueurs simultanés",
            'Sans publicité',
            'Accès au classement',
            'Sons de feedback exclusifs',
          ]}
          onBack={() => { playPrevious(); router.back(); }}
        />
      </MeshBackground>
    );
  }

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Salon en ligne</Text>
          <Text style={styles.subtitle}>Jusqu'à 8 joueurs en temps réel</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Tabs */}
        <View style={styles.tabRow}>
          {(['create', 'join'] as const).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabChip, tab === t && styles.tabChipActive]}
              onPress={() => { playClick(); setTab(t); }}
              activeOpacity={0.75}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t === 'create' ? '➕ Créer' : '🔑 Rejoindre'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'create' ? (
          <View style={styles.panel}>
            <Text style={styles.panelDesc}>
              Tu seras le Game Master — tu lances les sons et gères la partie.
            </Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => { playClick(); router.push('/(app)/salon-create'); }} activeOpacity={0.85}>
              <Text style={styles.primaryBtnText}>Configurer le salon  →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelDesc}>
              Saisis le code partagé par le Game Master.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={code}
              onChangeText={(t) => setCode(t.toUpperCase())}
              placeholder="Ex : AB12CD"
              placeholderTextColor={Colors.outline}
              maxLength={8}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={[styles.primaryBtn, !code.trim() && { opacity: 0.4 }]}
              onPress={handleJoin}
              disabled={!code.trim()}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryBtnText}>Rejoindre  →</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  title: { color: Colors.text, fontSize: 20, fontWeight: '900' },
  subtitle: { color: Colors.textMuted, fontSize: 12 },

  content: { flex: 1, padding: 20, gap: 20 },

  tabRow: { flexDirection: 'row', gap: 10 },
  tabChip: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
  },
  tabChipActive: { borderColor: Colors.primary + '88', backgroundColor: Colors.primaryDeep + '28' },
  tabText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },
  tabTextActive: { color: Colors.primary },

  panel: { gap: 16 },
  panelDesc: { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },

  premiumNote: {
    backgroundColor: Colors.tertiary + '18',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.tertiary + '55', padding: 14,
  },
  premiumNoteText: { color: Colors.tertiary, fontSize: 13, fontWeight: '600' },

  primaryBtn: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  codeInput: {
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 2, borderColor: Colors.primaryDeep + '88',
    paddingHorizontal: 18, color: Colors.text, fontSize: 24, fontWeight: '800',
    letterSpacing: 6, textAlign: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.3, shadowRadius: 10,
  },
});
