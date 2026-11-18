import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { getProfile, updateProfile } from '@/lib/auth';
import { fetchPlayerStats } from '@/lib/matches';
import { xpProgress } from '@/lib/progression';
import { fetchPlayerAchievements, Achievement, achievementTitle } from '@/lib/achievements';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { BottomNav } from '@/components/ui/BottomNav';
import { loadSounds, playClick, playPrevious } from '@/lib/sounds';

type Gender = 'masc' | 'fem' | 'non_precise';
interface Profile { id: string; username: string; avatar_url: string | null; gender: Gender; coins: number; xp: number; level: number; border_color?: string; username_color?: string; equipped_frame_id?: string | null; equipped_badge_id?: string | null; equipped_title_id?: string | null; }
interface Stats { gamesPlayed: number; gamesWon: number; totalXp: number; level: number; bestCombo: number; avgAccuracy: number; }
type AchievementWithStatus = Achievement & { unlockedAt: string | null };

const GENDER_OPTIONS: { value: Gender; label: string; sub: string }[] = [
  { value: 'masc',        label: 'Il',   sub: 'masculin' },
  { value: 'fem',         label: 'Elle', sub: 'féminin'  },
  { value: 'non_precise', label: 'Iel',  sub: 'neutre'   },
];

export default function ProfileScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats]     = useState<Stats | null>(null);
  const [achievements, setAchievements] = useState<AchievementWithStatus[]>([]);
  const [username, setUsername] = useState('');
  const [gender, setGender]     = useState<Gender>('masc');
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);

  useEffect(() => { loadSounds(); }, []);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      getProfile(user.id),
      fetchPlayerStats(user.id).catch(() => null),
      fetchPlayerAchievements(user.id).catch(() => []),
    ]).then(([p, s, a]) => {
      setProfile(p);
      setUsername(p.username);
      setGender((p.gender as Gender) ?? 'masc');
      setStats(s);
      setAchievements(a as AchievementWithStatus[]);
    }).finally(() => setLoading(false));
  }, [user]);

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    Alert.alert('Avatar', "Upload de l'avatar disponible après déploiement du serveur.");
  }

  async function handleSave() {
    if (!user || !username.trim()) return;
    setSaving(true);
    try {
      const updated = await updateProfile(user.id, { username: username.trim(), gender });
      setProfile(updated);
      Alert.alert('Succès', 'Profil mis à jour !');
    } catch (e: any) {
      Alert.alert('Erreur', e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profile) {
    return (
      <MeshBackground>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </MeshBackground>
    );
  }

  const totalXp = stats?.totalXp ?? profile.xp ?? 0;
  const prog    = xpProgress(totalXp);
  const xpPct   = prog.needed > 0 ? Math.min(1, prog.current / prog.needed) : 1;
  const unlockedCount = achievements.filter((a) => a.unlockedAt).length;

  return (
    <MeshBackground>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.replace('/(app)/home'); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon Profil</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>

        {/* Avatar */}
        <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrap} activeOpacity={0.85}>
          <Avatar
            size={96}
            uri={profile.avatar_url}
            username={profile.username}
            borderColor={profile.border_color}
            frameId={profile.equipped_frame_id}
            badgeId={profile.equipped_badge_id}
          />
          <View style={styles.avatarEdit}><Text style={{ fontSize: 12 }}>✏️</Text></View>
        </TouchableOpacity>

        <Text style={[styles.userName, profile.username_color ? { color: profile.username_color } : {}]}>
          {profile.username}
        </Text>

        {/* Niveau + XP */}
        <View style={styles.xpBlock}>
          <View style={styles.xpHeader}>
            <Text style={styles.xpLevel}>Niveau {prog.level}</Text>
            <Text style={styles.xpNumbers}>{prog.current} / {prog.needed} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <View style={[styles.xpFill, { width: `${Math.round(xpPct * 100)}%` as any }]} />
            <View style={[styles.xpHead, { left: `${Math.round(xpPct * 100) - 1}%` as any }]} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsGrid}>
          {[
            { value: stats?.gamesPlayed ?? 0, label: 'Parties' },
            { value: stats?.gamesWon ?? 0, label: 'Victoires' },
            { value: `${stats?.avgAccuracy ?? 0}%`, label: 'Précision' },
            { value: `×${stats?.bestCombo ?? 0}`, label: 'Meilleur combo' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Personnalisation */}
        <TouchableOpacity
          style={styles.cosmeticsBtn}
          onPress={() => { playClick(); router.push('/(app)/boutique'); }}
          activeOpacity={0.8}
        >
          <Avatar
            size={36}
            uri={profile.avatar_url}
            username={profile.username}
            borderColor={profile.border_color}
            frameId={profile.equipped_frame_id}
            badgeId={profile.equipped_badge_id}
          />
          <View style={{ flex: 1, gap: 1 }}>
            <Text style={styles.cosmeticsBtnLabel}>Personnalisation</Text>
            <Text style={styles.cosmeticsBtnSub}>Cadres, badges, titres, couleurs</Text>
          </View>
          <Text style={styles.cosmeticsArrow}>›</Text>
        </TouchableOpacity>

        {/* Formulaire */}
        <View style={styles.form}>
          <View style={styles.fieldBlock}>
            <Input label="Pseudo en jeu" value={username} onChangeText={setUsername} autoCapitalize="none" />
            <Text style={styles.fieldNote}>
              👥 Apparaît dans les classements et les parties locales.
            </Text>
          </View>

          <View style={styles.fieldBlock}>
            <View style={styles.pronounHeader}>
              <Text style={styles.pronounLabel}>Pronoms</Text>
              <Text style={styles.pronounSub}>Adapte l'accord de tes titres de succès</Text>
            </View>
            <View style={styles.genderRow}>
              {GENDER_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.genderBtn, gender === opt.value && styles.genderBtnActive]}
                  onPress={() => setGender(opt.value)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.genderBtnLabel, gender === opt.value && styles.genderBtnLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={[styles.genderBtnSub, gender === opt.value && styles.genderBtnSubActive]}>
                    {opt.sub}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldBlock}>
            <Input label="Email" value={user?.email ?? ''} editable={false} style={{ opacity: 0.5 }} />
            <Text style={styles.fieldNote}>L'email ne peut pas être modifié ici.</Text>
          </View>

          <Button label="Sauvegarder" onPress={handleSave} loading={saving} />
        </View>

        {/* Succès */}
        {achievements.length > 0 && (
          <View style={styles.achSection}>
            <View style={styles.achHeader}>
              <Text style={styles.achTitle}>Succès</Text>
              <View style={styles.achCountBadge}>
                <Text style={styles.achCountText}>{unlockedCount}/{achievements.length}</Text>
              </View>
            </View>
            <View style={styles.achGrid}>
              {achievements.map((a) => {
                const unlocked = !!a.unlockedAt;
                return (
                  <View key={a.id} style={[styles.achCard, !unlocked && styles.achCardLocked]}>
                    {unlocked
                      ? <Text style={styles.achEmoji}>{a.emoji}</Text>
                      : <Image source={require('@/assets/Icon/UI/padlock.png')} style={styles.achLock} resizeMode="contain" />
                    }
                    <Text style={[styles.achName, !unlocked && { color: Colors.outline }]} numberOfLines={2}>
                      {unlocked ? achievementTitle(a, gender) : a.title}
                    </Text>
                    {unlocked
                      ? <Text style={styles.achXp}>+{a.xpReward} XP</Text>
                      : <Text style={styles.achDesc} numberOfLines={2}>{a.description}</Text>
                    }
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>
      <BottomNav />
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(22,15,40,0.6)',
  },
  headerTitle: { color: Colors.text, fontSize: 18, fontWeight: '900' },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.primary, fontSize: 22 },

  container: { padding: 20, paddingBottom: 110, gap: 22, alignItems: 'center' },

  avatarWrap: { position: 'relative', marginTop: 4 },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: Colors.primaryDeep, borderRadius: 14, padding: 5,
    borderWidth: 2, borderColor: Colors.background,
  },

  userName: { color: Colors.text, fontSize: 22, fontWeight: '900', letterSpacing: -0.3, marginTop: -6 },

  xpBlock: { width: '100%', gap: 8 },
  xpHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  xpLevel: { color: Colors.primary, fontSize: 14, fontWeight: '800' },
  xpNumbers: { color: Colors.textMuted, fontSize: 12 },
  xpTrack: {
    height: 10, backgroundColor: Colors.surfaceHighest, borderRadius: 5, overflow: 'visible',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', position: 'relative',
  },
  xpFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 5, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 6 },
  xpHead: {
    position: 'absolute', top: -3, width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.text, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.9, shadowRadius: 8,
  },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  statCard: {
    flex: 1, minWidth: '45%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', paddingVertical: 16, gap: 4,
  },
  statValue: { color: Colors.text, fontSize: 22, fontWeight: '900' },
  statLabel: { color: Colors.textMuted, fontSize: 12 },

  achSection: { width: '100%', gap: 14 },
  achHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  achTitle: { color: Colors.text, fontSize: 17, fontWeight: '800', flex: 1 },
  achCountBadge: {
    backgroundColor: Colors.primaryDeep + '33',
    borderRadius: 9999, borderWidth: 1, borderColor: Colors.primary + '55',
    paddingHorizontal: 10, paddingVertical: 3,
  },
  achCountText: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  achGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  achCard: {
    width: '47%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1, borderColor: Colors.primary + '44',
    padding: 12, alignItems: 'center', gap: 5,
  },
  achCardLocked: { borderColor: 'rgba(255,255,255,0.10)', opacity: 0.6 },
  achEmoji: { fontSize: 28 },
  achLock: { width: 28, height: 28, opacity: 0.45 },
  achName: { color: Colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center' },
  achXp: { color: Colors.primary, fontSize: 11, fontWeight: '700' },
  achDesc: { color: Colors.textMuted, fontSize: 10, textAlign: 'center', lineHeight: 14 },

  cosmeticsBtn: {
    width: '100%',
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
  },
  cosmeticsBtnLabel: { color: Colors.text, fontSize: 15, fontWeight: '700' },
  cosmeticsBtnSub: { color: Colors.textMuted, fontSize: 12 },
  cosmeticsArrow: { color: Colors.primary, fontSize: 22 },

  form: { width: '100%', gap: 16 },
  fieldBlock: { gap: 6 },
  fieldNote: { color: Colors.textMuted, fontSize: 12, lineHeight: 18, paddingHorizontal: 2 },

  pronounHeader: { gap: 2, marginBottom: 2 },
  pronounLabel: { color: Colors.text, fontSize: 14, fontWeight: '700' },
  pronounSub: { color: Colors.textMuted, fontSize: 11 },

  genderRow: { flexDirection: 'row', gap: 8 },
  genderBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', gap: 2,
  },
  genderBtnActive: { borderColor: Colors.primary + '99', backgroundColor: Colors.primaryDeep + '28' },
  genderBtnLabel: { color: Colors.textMuted, fontSize: 16, fontWeight: '800' },
  genderBtnLabelActive: { color: Colors.primary },
  genderBtnSub: { color: Colors.outline, fontSize: 10 },
  genderBtnSubActive: { color: Colors.primary + 'AA' },
});
