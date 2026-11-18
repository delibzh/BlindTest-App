import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions, Image } from 'react-native';
import { router } from 'expo-router';
import { CategoryPicker } from '@/components/ui/CategoryPicker';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

const MAX_COUNT = 200;
const { width: SCREEN_W } = Dimensions.get('window');

const PLAYER_COLORS = [
  Colors.primary, '#ec4899', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316',
];

function SectionBlock({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={blockStyles.wrapper}>
      <View style={blockStyles.header}>
        <Text style={blockStyles.title}>{title}</Text>
        {subtitle ? <Text style={blockStyles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={blockStyles.content}>{children}</View>
    </View>
  );
}

const blockStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 2,
  },
  title: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  subtitle: { color: Colors.textMuted, fontSize: 12 },
  content: { padding: 16, gap: 12 },
});

export default function BuzzSetupScreen() {
  const { user } = useAuth();
  const myName = user?.user_metadata?.username ?? user?.email?.split('@')[0] ?? null;

  const [selected, setSelected] = useState<string[]>(['anime', 'games']);
  const [count, setCount] = useState(25);
  const [wrongRule, setWrongRule] = useState<'malus' | 'skip' | 'gorgee'>('malus');
  const [players, setPlayers] = useState<string[]>([]);

  useEffect(() => {
    loadSounds();
    if (myName && !players.includes(myName)) {
      setPlayers([myName]);
    }
  }, [myName]);
  const [newName, setNewName] = useState('');
  const [selectedZone, setSelectedZone] = useState<number | null>(null);
  const inputRef = useRef<TextInput>(null);

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
    setSelectedZone(null);
    inputRef.current?.focus();
  }

  function removePlayer(name: string) {
    playClick();
    setPlayers((p) => p.filter((n) => n !== name));
    setSelectedZone(null);
  }

  function handleZoneTap(i: number) {
    playClick();
    if (selectedZone === null) {
      setSelectedZone(i);
    } else if (selectedZone === i) {
      setSelectedZone(null);
    } else {
      setPlayers((prev) => {
        const next = [...prev];
        [next[selectedZone], next[i]] = [next[i], next[selectedZone]];
        return next;
      });
      setSelectedZone(null);
    }
  }

  function handlePlay() {
    playClick();
    router.push({
      pathname: '/(app)/buzz-game',
      params: { categories: selected.join(','), count: String(count), wrongRule, players: players.join('|') },
    });
  }

  const canStart = players.length >= 2;
  const zoneH = 90;

  return (
    <MeshBackground>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => { playPrevious(); router.back(); }} style={styles.back}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Mode Buzz ⚡</Text>

      {/* ── Joueurs ── */}
      <SectionBlock
        title={`Joueurs  ${players.length}/8`}
        subtitle="Minimum 2 joueurs pour commencer"
      >
        <View style={styles.addRow}>
          <TextInput
            ref={inputRef}
            style={styles.addInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Prénom ou nom d'équipe..."
            placeholderTextColor={Colors.textMuted}
            onSubmitEditing={addPlayer}
            returnKeyType="done"
            autoFocus
          />
          <TouchableOpacity style={[styles.addBtn, !newName.trim() && styles.addBtnDisabled]} onPress={addPlayer}>
            <Text style={styles.addBtnText}>+</Text>
          </TouchableOpacity>
        </View>

        {players.length >= 5 && (
          <View style={styles.teamSuggestion}>
            <Text style={styles.teamSuggestionText}>
              💡 Vous êtes nombreux ! Pensez à jouer en équipes (ex. "Les Rois", "Team B"…)
            </Text>
          </View>
        )}

        {myName && players.includes(myName) && (
          <Text style={styles.meNote}>👤 Tu es automatiquement ajouté — modifie ton pseudo dans ton profil</Text>
        )}
        {players.length === 0 && (
          <Text style={styles.emptyPlayers}>Aucun joueur ajouté</Text>
        )}
      </SectionBlock>

      {/* ── Placement des zones ── */}
      {players.length >= 2 && (
        <SectionBlock
          title="Placement des zones"
          subtitle={selectedZone !== null ? '👆 Tape une autre zone pour l\'échanger' : 'Tape 2 zones pour les échanger · ✕ pour supprimer'}
        >
          <View style={styles.phoneFrame}>
            <View style={styles.phoneEdge}>
              <View style={styles.phoneEdgeLine} />
              <Text style={styles.phoneEdgeLabel}>HAUT DU TÉLÉPHONE</Text>
              <View style={styles.phoneEdgeLine} />
            </View>

            <View style={styles.zonesGrid}>
              {players.map((name, i) => {
                const color = PLAYER_COLORS[i % PLAYER_COLORS.length];
                const isLastOdd = players.length % 2 !== 0 && i === players.length - 1;
                const isSelected = selectedZone === i;
                return (
                  <TouchableOpacity
                    key={`${name}-${i}`}
                    style={[
                      styles.zoneCard,
                      {
                        width: isLastOdd ? '100%' : '50%',
                        height: zoneH,
                        backgroundColor: isSelected ? color + '44' : color + '1a',
                        borderColor: isSelected ? color : color + '55',
                        borderWidth: isSelected ? 2.5 : 1,
                      },
                    ]}
                    onPress={() => handleZoneTap(i)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.zoneFingerprint, { borderColor: color + (isSelected ? 'ff' : '99') }]}>
                      <Text style={[styles.zoneFingerprintNum, { color }]}>{name === myName ? '👤' : i + 1}</Text>
                    </View>
                    <Text style={[styles.zoneName, { color }]} numberOfLines={1}>{name}</Text>
                    {isSelected && <Text style={styles.zoneSelectedBadge}>✓</Text>}
                    <TouchableOpacity style={styles.zoneRemove} onPress={() => removePlayer(name)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                      <Text style={styles.zoneRemoveText}>✕</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.phoneEdge}>
              <View style={styles.phoneEdgeLine} />
              <Text style={styles.phoneEdgeLabel}>BAS DU TÉLÉPHONE</Text>
              <View style={styles.phoneEdgeLine} />
            </View>
          </View>

          <Text style={styles.zoneFootnote}>
            Chaque joueur se place du côté de sa zone avant de lancer
          </Text>
        </SectionBlock>
      )}

      {/* ── Catégories ── */}
      <SectionBlock title="Catégories" subtitle={`${selected.length} sélectionnée${selected.length > 1 ? 's' : ''}`}>
        <CategoryPicker selected={selected} onToggle={toggleCategory} />
      </SectionBlock>

      {/* ── Nombre de sons ── */}
      <SectionBlock title="Nombre de sons">
        <View style={styles.countStepper}>
          <TouchableOpacity
            style={[styles.stepBtn, count <= 25 && styles.stepBtnDisabled]}
            onPress={() => { playClick(); setCount((c) => Math.max(25, c - 25)); }}
            disabled={count <= 25}
          >
            <Text style={styles.stepBtnText}>−25</Text>
          </TouchableOpacity>
          <View style={styles.stepValue}>
            <Text style={styles.stepCount}>{count}</Text>
            <Text style={styles.stepLabel}>sons</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepBtn, count >= MAX_COUNT && styles.stepBtnDisabled]}
            onPress={() => { playClick(); setCount((c) => Math.min(MAX_COUNT, c + 25)); }}
            disabled={count >= MAX_COUNT}
          >
            <Text style={styles.stepBtnText}>+25</Text>
          </TouchableOpacity>
        </View>
      </SectionBlock>

      {/* ── Mauvaise réponse ── */}
      <SectionBlock title="Mauvaise réponse" subtitle="Que se passe-t-il si le buzzeur se trompe ?">
        {([
          { id: 'malus',  label: 'Malus',  icon: true,  detail: '−3 pts' },
          { id: 'gorgee', label: '🍺 Gorgée', icon: false, detail: 'Sans points' },
          { id: 'skip',   label: '⏭ Passer',  icon: false, detail: 'Sans malus' },
        ] as const).map((rule) => {
          const active = wrongRule === rule.id;
          return (
            <TouchableOpacity
              key={rule.id}
              style={[styles.ruleBtn, active && styles.ruleBtnActive]}
              onPress={() => { playClick(); setWrongRule(rule.id); }}
            >
              <View style={styles.ruleLabelRow}>
                {rule.icon && <Image source={require('@/assets/Icon/UI/death.png')} style={styles.ruleLabelIcon} />}
                <Text style={[styles.ruleLabel, active && styles.ruleLabelActive]}>{rule.label}</Text>
              </View>
              <Text style={[styles.ruleDetail, active && styles.ruleDetailActive]}>{rule.detail}</Text>
            </TouchableOpacity>
          );
        })}
      </SectionBlock>

      {/* ── Lancer ── */}
      <TouchableOpacity
        style={[styles.playBtn, !canStart && styles.playBtnDisabled]}
        onPress={handlePlay}
        disabled={!canStart}
      >
        <Text style={styles.playBtnText}>
          {canStart ? `Commencer · ${count} sons` : `Ajoute ${2 - players.length} joueur(s) minimum`}
        </Text>
      </TouchableOpacity>
    </ScrollView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 56, paddingBottom: 32, gap: 14 },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800', marginBottom: 4 },

  addRow: { flexDirection: 'row', gap: 10 },
  addInput: { flex: 1, height: 50, backgroundColor: Colors.background, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14, color: Colors.text, fontSize: 16 },
  addBtn: { width: 50, height: 50, backgroundColor: Colors.primary, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { color: '#fff', fontSize: 26, fontWeight: '700' },
  emptyPlayers: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', paddingVertical: 4 },
  meNote: { color: Colors.primary, fontSize: 12, opacity: 0.8 },
  teamSuggestion: { backgroundColor: Colors.warning + '18', borderRadius: 10, borderWidth: 1, borderColor: Colors.warning + '44', padding: 10 },
  teamSuggestionText: { color: Colors.warning, fontSize: 13, lineHeight: 19 },

  phoneFrame: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, overflow: 'hidden' },
  phoneEdge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.background },
  phoneEdgeLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  phoneEdgeLabel: { color: Colors.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  zonesGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  zoneCard: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, position: 'relative' },
  zoneFingerprint: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  zoneFingerprintNum: { fontSize: 16, fontWeight: '900' },
  zoneName: { fontSize: 15, fontWeight: '800', flex: 1 },
  zoneSelectedBadge: { fontSize: 16, color: '#fff', position: 'absolute', top: 8, left: 8 },
  zoneRemove: { position: 'absolute', top: 8, right: 10 },
  zoneRemoveText: { color: Colors.textMuted, fontSize: 13 },
  zoneFootnote: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', fontStyle: 'italic' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  countStepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 64, height: 52, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, backgroundColor: Colors.primary + '22', alignItems: 'center', justifyContent: 'center' },
  stepBtnDisabled: { borderColor: Colors.border, backgroundColor: Colors.background, opacity: 0.4 },
  stepBtnText: { color: Colors.primary, fontSize: 16, fontWeight: '800' },
  stepValue: { flex: 1, alignItems: 'center' },
  stepCount: { color: Colors.text, fontSize: 36, fontWeight: '900' },
  stepLabel: { color: Colors.textMuted, fontSize: 13 },

  ruleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  ruleBtnActive: { borderColor: Colors.warning, backgroundColor: Colors.warning + '18' },
  ruleLabel: { color: Colors.textMuted, fontSize: 15, fontWeight: '700' },
  ruleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ruleLabelIcon: { width: 16, height: 16 },
  ruleLabelActive: { color: Colors.warning },
  ruleDetail: { color: Colors.textMuted, fontSize: 13 },
  ruleDetailActive: { color: Colors.warning, fontWeight: '600' },

  playBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 56, alignItems: 'center', justifyContent: 'center' },
  playBtnDisabled: { opacity: 0.4 },
  playBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
