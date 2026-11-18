import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { getOfferings, purchasePackage, restorePurchases, getCustomerInfo, isPremium, syncPremiumToSupabase } from '@/lib/purchases';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { loadSounds, playPrevious } from '@/lib/sounds';
import type { PurchasesPackage } from 'react-native-purchases';

const PERKS = [
  { emoji: '🚫', label: 'Zéro publicité — jamais d\'interstitielle' },
  { emoji: '🏆', label: 'Leaderboard global — prouve que tu régales' },
  { emoji: '🌐', label: 'Salon multijoueur en ligne' },
  { emoji: '🔊', label: 'Sons exclusifs (FAHH & autres effets)' },
  { emoji: '🎨', label: 'Cosmétiques exclusifs' },
];

export default function PaywallScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [packages, setPackages]     = useState<PurchasesPackage[]>([]);
  const [selected, setSelected]     = useState<PurchasesPackage | null>(null);
  const [loading, setLoading]       = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring]   = useState(false);

  useEffect(() => { loadSounds(); }, []);
  useEffect(() => { tryNativePaywall(); }, []);

  async function tryNativePaywall() {
    try {
      const RevenueCatUI = require('react-native-purchases-ui').default;
      const { PAYWALL_RESULT } = require('react-native-purchases-ui');
      const result = await RevenueCatUI.presentPaywall();
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        await handleSuccess();
      }
      router.back();
    } catch {
      loadOfferings();
    }
  }

  async function loadOfferings() {
    try {
      const pkgs = await getOfferings();
      setPackages(pkgs);
      if (pkgs.length > 0) setSelected(pkgs[0]);
    } catch {}
    finally { setLoading(false); }
  }

  async function handleSuccess() {
    if (!user) return;
    try {
      const info = await getCustomerInfo();
      if (isPremium(info)) {
        await syncPremiumToSupabase(user.id, info);
        Alert.alert('✨ Bienvenue Premium !', 'Tu as maintenant accès à tout le contenu.');
      }
    } catch {}
  }

  async function handlePurchase() {
    if (!selected) return;
    setPurchasing(true);
    try {
      await purchasePackage(selected);
      await handleSuccess();
      router.back();
    } catch (e: any) {
      if (!e?.userCancelled) Alert.alert('Erreur', "L'achat n'a pas pu être finalisé. Réessaie plus tard.");
    } finally { setPurchasing(false); }
  }

  async function handleRestore() {
    setRestoring(true);
    try {
      const info = await restorePurchases();
      if (isPremium(info)) {
        if (user) await syncPremiumToSupabase(user.id, info);
        Alert.alert('✅ Achats restaurés', 'Ton accès Premium est actif !');
        router.back();
      } else {
        Alert.alert('Aucun achat trouvé', "Aucun abonnement Premium actif n'est associé à ce compte.");
      }
    } catch {
      Alert.alert('Erreur', 'Impossible de restaurer les achats.');
    } finally { setRestoring(false); }
  }

  if (loading) {
    return (
      <MeshBackground>
        <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
      </MeshBackground>
    );
  }

  return (
    <MeshBackground>
      {/* Close */}
      <TouchableOpacity
        style={[styles.closeBtn, { top: insets.top + 12 }]}
        onPress={() => { playPrevious(); router.back(); }}
        hitSlop={12}
      >
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Image source={require('@/assets/Icon/UI/premium.png')} style={styles.heroEmoji} resizeMode="contain" />
          <Text style={styles.heroTitle}>Joue sans pub.{'\n'}Régale le classement.</Text>
          <Text style={styles.heroSub}>Le catalogue est gratuit pour tous.{'\n'}Le Premium, c'est pour ceux qui veulent dominer.</Text>
        </View>

        {/* Avantages */}
        <View style={styles.perksCard}>
          {PERKS.map((p, i) => (
            <View key={i} style={styles.perkRow}>
              <View style={styles.perkIconWrap}>
                <Text style={styles.perkEmoji}>{p.emoji}</Text>
              </View>
              <Text style={styles.perkLabel}>{p.label}</Text>
            </View>
          ))}
        </View>

        {/* Offres */}
        {packages.length > 0 ? (
          <View style={styles.packagesCol}>
            {packages.map((pkg) => {
              const isSel = selected?.identifier === pkg.identifier;
              return (
                <TouchableOpacity
                  key={pkg.identifier}
                  style={[styles.packageCard, isSel && styles.packageCardActive]}
                  onPress={() => setSelected(pkg)}
                  activeOpacity={0.8}
                >
                  <View style={styles.packageLeft}>
                    <Text style={[styles.packageTitle, isSel && styles.packageTitleActive]}>
                      {pkg.product.title || pkg.packageType}
                    </Text>
                    {pkg.product.description
                      ? <Text style={styles.packageDesc}>{pkg.product.description}</Text>
                      : null
                    }
                  </View>
                  <Text style={[styles.packagePrice, isSel && styles.packagePriceActive]}>
                    {pkg.product.priceString}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.devBanner}>
            <Text style={styles.devBannerText}>
              💡 En mode développement — les offres s'afficheront dans un build natif signé.
            </Text>
          </View>
        )}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.ctaBtn, (purchasing || packages.length === 0) && { opacity: 0.5 }]}
          onPress={handlePurchase}
          disabled={purchasing || packages.length === 0}
          activeOpacity={0.85}
        >
          {purchasing
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.ctaText}>
                {selected ? `Continuer — ${selected.product.priceString}` : 'Continuer'}
              </Text>
          }
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRestore} disabled={restoring} style={styles.restoreBtn}>
          {restoring
            ? <ActivityIndicator color={Colors.textMuted} size="small" />
            : <Text style={styles.restoreText}>Restaurer mes achats</Text>
          }
        </TouchableOpacity>

        <Text style={styles.legal}>
          L'abonnement se renouvelle automatiquement sauf résiliation 24h avant l'échéance.
          Gérable depuis les réglages App Store / Google Play.
        </Text>

      </ScrollView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  closeBtn: {
    position: 'absolute',
    right: 20,
    zIndex: 10,
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: Colors.textMuted, fontSize: 14, fontWeight: '700' },

  scroll: { padding: 24, paddingBottom: 48, gap: 20 },

  hero: { alignItems: 'center', paddingVertical: 16, gap: 10 },
  heroEmoji: { width: 80, height: 80 },
  heroTitle: { color: Colors.text, fontSize: 30, fontWeight: '900', textAlign: 'center', letterSpacing: -0.5 },
  heroSub: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', lineHeight: 22 },

  perksCard: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 18, gap: 14,
  },
  perkRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  perkIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: Colors.primaryDeep + '28',
    alignItems: 'center', justifyContent: 'center',
  },
  perkEmoji: { fontSize: 18 },
  perkLabel: { color: Colors.text, fontSize: 14, flex: 1, fontWeight: '500' },

  packagesCol: { gap: 10 },
  packageCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)',
    padding: 16, gap: 12,
  },
  packageCardActive: {
    borderColor: Colors.tertiary + '88',
    backgroundColor: Colors.tertiary + '14',
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 14,
  },
  packageLeft: { flex: 1, gap: 2 },
  packageTitle: { color: Colors.textMuted, fontSize: 15, fontWeight: '700' },
  packageTitleActive: { color: Colors.text },
  packageDesc: { color: Colors.textMuted, fontSize: 12 },
  packagePrice: { color: Colors.textMuted, fontSize: 16, fontWeight: '800' },
  packagePriceActive: { color: Colors.tertiary },

  devBanner: {
    backgroundColor: Colors.warning + '18',
    borderRadius: 14, borderWidth: 1, borderColor: Colors.warning + '44', padding: 14,
  },
  devBannerText: { color: Colors.warning, fontSize: 13, lineHeight: 20, textAlign: 'center' },

  ctaBtn: {
    backgroundColor: Colors.tertiary,
    borderRadius: 18, paddingVertical: 18, alignItems: 'center',
    shadowColor: Colors.tertiary,
    shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 20,
  },
  ctaText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  restoreBtn: { alignItems: 'center', paddingVertical: 8 },
  restoreText: { color: Colors.textMuted, fontSize: 14 },

  legal: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 18, opacity: 0.7 },
});
