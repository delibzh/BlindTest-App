import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { playClick } from '@/lib/sounds';

interface Props {
  title: string;
  description: string;
  perks: string[];
  onBack: () => void;
}

export function PremiumGate({ title, description, perks, onBack }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.iconWrap}>
        <Image source={require('@/assets/Icon/UI/padlock.png')} style={styles.lockIcon} resizeMode="contain" />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>

      <View style={styles.perksCard}>
        {perks.map((perk, i) => (
          <View key={i} style={styles.perkRow}>
            <Text style={styles.perkDot}>✦</Text>
            <Text style={styles.perkText}>{perk}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.ctaBtn}
        onPress={() => { playClick(); router.push('/(app)/paywall'); }}
        activeOpacity={0.85}
      >
        <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.ctaBtnIcon} resizeMode="contain" />
        <Text style={styles.ctaBtnText}>Découvrir Premium</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onBack} activeOpacity={0.7} style={styles.backBtn}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 20,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: Colors.tertiary + '18',
    borderWidth: 1.5,
    borderColor: Colors.tertiary + '44',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockIcon: { width: 38, height: 38 },
  title: {
    color: Colors.text,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    color: Colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
  },
  perksCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    gap: 12,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  perkDot: { color: Colors.tertiary, fontSize: 12 },
  perkText: { color: Colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  ctaBtn: {
    width: '100%',
    backgroundColor: Colors.tertiary + '18',
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.tertiary + '66',
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  ctaBtnIcon: { width: 20, height: 20 },
  ctaBtnText: { color: Colors.tertiary, fontSize: 15, fontWeight: '800' },
  backBtn: { paddingVertical: 8 },
  backText: { color: Colors.primary, fontSize: 15, fontWeight: '600' },
});
