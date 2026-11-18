import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

const MAX_COUNT = 200;

const PLAYER_COLORS = [
  '#ecb2ff', '#00eefc', '#f59e0b', '#22c55e',
  '#e7006e', '#8b5cf6', '#f97316', '#06b6d4',
];

const WRONG_RULES = [
  { id: 'skip',   emoji: '⏭', label: 'Passer',   detail: 'Sans malus' },
  { id: 'malus',  emoji: null,  label: 'Malus',    detail: '−1 pt' },
  { id: 'gorgee', emoji: '🍺', label: 'Gorgée',   detail: 'À boire !' },
] as const;

export default function SoireeSetupScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const myName = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? null;

  const [selected,  setSelected]  = useState<string[]>(['anime', 'games']);
  const [count,     setCount]     = useState(25);
  const [roundSec,  setRoundSec]  = useState(20);
  const [wrongRule, setWrongRule] = useState<'malus' | 'skip' | 'gorgee'>('skip');
  const [players,   setPlayers]   = useState<string[]>([]);
  const [newName,   setNewName]   = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    loadSounds();
    if (myName && !players.includes(myName)) setPlayers([myName]);
  }, [myName]);

  function toggleCategory(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((c) => c !== id) : prev) : [...prev, id]
    );
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name || players.includes(name) || players.length >= 8) return;
    setPlayers((p) => [...p, name]);
    setNewName('');
    inputRef.current?.focus();
  }

  function removePlayer(name: string) {
    playClick();
    setPlayers((p) => p.filter((n) => n !== name));
  }

  function handlePlay() {
    playClick();
    router.push({
      pathname: '/(app)/soiree-game',
      params: { categories: selected.join(','), count: String(count), wrongRule, players: players.join('|'), timer: String(roundSec) },
    });
  }

  const canStart = players.length >= 2;

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={s.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.title}>Mode Confiance</Text>
          <Text style={s.subtitle}>Réponses à l'oral · un seul téléphone</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.container} keyboardShouldPersistTaps="handled">

        {/* ── Joueurs ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Joueurs</Text>
            <Text style={s.sectionSub}>{players.length}/8 — min. 2</Text>
          </View>

          <View style={s.addRow}>
            <TextInput
              ref={inputRef}
              style={s.addInput}
              value={newName}
              onChangeText={setNewName}
              placeholder="Prénom du joueur…"
              placeholderTextColor={Colors.outline}
              onSubmitEditing={addPlayer}
              returnKeyType="done"
              autoFocus
            />
            <TouchableOpacity
              style={[s.addBtn, !newName.trim() && s.addBtnDisabled]}
              onPress={addPlayer}
              activeOpacity={0.8}
            >
              <Text style={s.addBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {players.length === 0 ? (
            <Text style={s.emptyNote}>Ajoute au moins 2 joueurs pour commencer</Text>
          ) : (
            <View style={s.playersList}>
              {players.map((name, i) => {
                const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                const isMe  = name === myName;
                return (
                  <View key={name} style={[s.playerChip, { borderColor: color + '99', backgroundColor: color + '18' }]}>
                    <View style={[s.playerDot, { backgroundColor: color }]} />
                    <Text style={[s.playerName, { color }]}>{name}</Text>
                    {isMe && <Text style={s.meTag}>moi</Text>}
                    {!isMe && (
                      <TouchableOpacity onPress={() => removePlayer(name)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                        <Text style={s.removeIcon}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── Catégories ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Catégories</Text>
            <Text style={s.sectionSub}>{selected.length} sélectionnée{selected.length > 1 ? 's' : ''}</Text>
          </View>
          <CategoryPicker selected={selected} onToggle={toggleCategory} />
        </View>

        {/* ── Nombre de sons ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Nombre de sons</Text>
          </View>
          <View style={s.stepper}>
            <TouchableOpacity
              style={[s.stepBtn, count <= 25 && s.stepBtnDisabled]}
              onPress={() => { playClick(); setCount((c) => Math.max(25, c - 25)); }}
              disabled={count <= 25}
              activeOpacity={0.75}
            >
              <Text style={s.stepBtnText}>−25</Text>
            </TouchableOpacity>
            <View style={s.stepValue}>
              <Text style={s.stepCount}>{count}</Text>
              <Text style={s.stepLabel}>sons</Text>
            </View>
            <TouchableOpacity
              style={[s.stepBtn, count >= MAX_COUNT && s.stepBtnDisabled]}
              onPress={() => { playClick(); setCount((c) => Math.min(MAX_COUNT, c + 25)); }}
              disabled={count >= MAX_COUNT}
              activeOpacity={0.75}
            >
              <Text style={s.stepBtnText}>+25</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Temps par son ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Temps par son</Text>
            <Text style={s.sectionSub}>{roundSec} secondes</Text>
          </View>
          <View style={s.timerRow}>
            {[10, 20, 30].map(sec => (
              <TouchableOpacity
                key={sec}
                style={[s.timerBtn, roundSec === sec && s.timerBtnActive]}
                onPress={() => { playClick(); setRoundSec(sec); }}
                activeOpacity={0.75}
              >
                <Text style={[s.timerBtnNum, roundSec === sec && s.timerBtnNumActive]}>{sec}</Text>
                <Text style={[s.timerBtnLabel, roundSec === sec && s.timerBtnLabelActive]}>sec</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── Mauvaise réponse ── */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Mauvaise réponse</Text>
            <Text style={s.sectionSub}>Que se passe-t-il ?</Text>
          </View>
          <View style={s.ruleRow}>
            {WRONG_RULES.map((rule) => {
              const active = wrongRule === rule.id;
              return (
                <TouchableOpacity
                  key={rule.id}
                  style={[s.ruleBtn, active && s.ruleBtnActive]}
                  onPress={() => { playClick(); setWrongRule(rule.id); }}
                  activeOpacity={0.75}
                >
                  {rule.emoji
                    ? <Text style={s.ruleEmoji}>{rule.emoji}</Text>
                    : <Image source={require('@/assets/Icon/UI/death.png')} style={s.ruleEmojiImg} />
                  }
                  <Text style={[s.ruleLabel, active && s.ruleLabelActive]}>{rule.label}</Text>
                  <Text style={[s.ruleDetail, active && s.ruleDetailActive]}>{rule.detail}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Lancer ── */}
        <TouchableOpacity
          style={[s.playBtn, !canStart && s.playBtnDisabled]}
          onPress={handlePlay}
          disabled={!canStart}
          activeOpacity={0.85}
        >
          <Text style={s.playBtnText}>
            {canStart
              ? `Commencer · ${count} sons`
              : `Ajoute ${2 - players.length} joueur${2 - players.length > 1 ? 's' : ''} minimum`}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </MeshBackground>
  );
}

const s = StyleSheet.create({
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

  container: { padding: 16, paddingBottom: 40, gap: 14 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  sectionTitle: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  sectionSub: { color: Colors.textMuted, fontSize: 12 },

  // Joueurs
  addRow: { flexDirection: 'row', gap: 10, padding: 14, paddingBottom: 0 },
  addInput: {
    flex: 1, height: 50,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    paddingHorizontal: 14, color: Colors.text, fontSize: 16,
  },
  addBtn: {
    width: 50, height: 50,
    backgroundColor: Colors.primaryDeep,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 12,
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '700', lineHeight: 30 },

  emptyNote: { color: Colors.textMuted, fontSize: 13, textAlign: 'center', padding: 16 },

  playersList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
  playerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  playerDot: { width: 8, height: 8, borderRadius: 4 },
  playerName: { fontSize: 14, fontWeight: '700' },
  meTag: { color: Colors.outline, fontSize: 11, fontWeight: '600' },
  removeIcon: { color: Colors.outline, fontSize: 13 },

  // Stepper
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  stepBtn: {
    width: 64, height: 52, borderRadius: 14,
    borderWidth: 1.5, borderColor: Colors.primaryDeep,
    backgroundColor: Colors.primaryDeep + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnDisabled: { borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'transparent', opacity: 0.35 },
  stepBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  stepValue: { flex: 1, alignItems: 'center' },
  stepCount: { color: Colors.text, fontSize: 36, fontWeight: '900' },
  stepLabel: { color: Colors.textMuted, fontSize: 12 },

  // Timer
  timerRow: { flexDirection: 'row', gap: 10, padding: 14 },
  timerBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.04)',
  },
  timerBtnActive: { borderColor: Colors.secondary + '88', backgroundColor: Colors.secondary + '18' },
  timerBtnNum: { color: Colors.textMuted, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  timerBtnNumActive: { color: Colors.secondary },
  timerBtnLabel: { color: Colors.outline, fontSize: 11, fontWeight: '600' },
  timerBtnLabelActive: { color: Colors.secondary + 'AA' },

  // Mauvaise réponse
  ruleRow: { flexDirection: 'row', padding: 12, gap: 10 },
  ruleBtn: {
    flex: 1, alignItems: 'center', gap: 4,
    paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ruleBtnActive: {
    borderColor: Colors.warning + '88',
    backgroundColor: Colors.warning + '18',
  },
  ruleEmoji: { fontSize: 20 },
  ruleEmojiImg: { width: 20, height: 20 },
  ruleLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '700' },
  ruleLabelActive: { color: Colors.warning },
  ruleDetail: { color: Colors.outline, fontSize: 11 },
  ruleDetailActive: { color: Colors.warning + 'AA' },

  // Lancer
  playBtn: {
    backgroundColor: Colors.primaryDeep,
    borderRadius: 9999, height: 56,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primaryDeep,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.7, shadowRadius: 20,
  },
  playBtnDisabled: { opacity: 0.35 },
  playBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
