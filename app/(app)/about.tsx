import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { Colors } from '@/constants/colors';
import { loadSounds, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

export default function AboutScreen() {
  useEffect(() => { loadSounds(); }, []);
  return (
    <MeshBackground>
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => { playPrevious(); router.back(); }} style={styles.back}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>

      <Text style={styles.title}>À propos</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>L'histoire de Talaref</Text>
        <Text style={styles.cardText}>
          Je suis un développeur solo et j'ai créé Talaref pour m'amuser avec mes amis.
          {'\n\n'}
          J'en avais marre de chercher des blindtests en ligne qui ne correspondaient jamais à ce qu'on voulait — mauvaises catégories, interface nulle, pas de personnalisation. Organiser une soirée avec des gens aux goûts différents, c'était la croix et la bannière.
          {'\n\n'}
          Alors j'ai fait ma propre appli. Voilà.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Un retour ? Une idée ?</Text>
        <Text style={styles.cardText}>
          Toutes les suggestions sont les bienvenues — nouvelles catégories, modes de jeu, bugs, idées folles…
          {'\n\n'}
          L'appli évolue en fonction de ce que les gens trouvent fun. N'hésite pas à écrire.
        </Text>
        <TouchableOpacity onPress={() => Linking.openURL('mailto:ecchoguess@gmail.com')} style={styles.contactBtn}>
          <Text style={styles.contactBtnText}>✉️ ecchoguess@gmail.com</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Soutenir le projet</Text>
        <Text style={styles.cardText}>
          Talaref est gratuit et le restera. Si tu kiffes l'appli et que tu veux qu'elle continue d'évoluer, la version Premium permet d'accéder à plus de sons et de débloquer des cosmétiques — et ça aide à couvrir les frais de serveur.
          {'\n\n'}
          Pas d'obligation, juste un coup de pouce si tu en as envie.
        </Text>
        <TouchableOpacity style={styles.premiumBtn} onPress={() => router.push('/(app)/paywall')}>
          <Text style={styles.premiumBtnText}>Voir le Premium ›</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Talaref · Fait avec ☕ et trop peu de sommeil</Text>
        <Text style={styles.version}>v1.0.0</Text>
      </View>
    </ScrollView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingTop: 56, gap: 16, paddingBottom: 40 },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 28, fontWeight: '800' },

  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    gap: 10,
  },
  cardTitle: { color: Colors.text, fontSize: 17, fontWeight: '800' },
  cardText: { color: Colors.textMuted, fontSize: 14, lineHeight: 22 },

  premiumBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 13,
    marginTop: 4,
  },
  premiumBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  footer: { alignItems: 'center', gap: 4, marginTop: 8 },
  contactBtn: { backgroundColor: Colors.surface, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  contactBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
  footerText: { color: Colors.textMuted, fontSize: 12 },
  version: { color: Colors.textMuted, fontSize: 11, opacity: 0.5 },
});
