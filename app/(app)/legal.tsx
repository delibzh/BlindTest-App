import { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';
import { loadSounds, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

const UI_CREDITS = [
  { label: 'Confiance',  author: 'okaikon',       title: 'Integrity icons',                url: 'https://www.flaticon.com/free-icons/integrity' },
  { label: 'Buzzer',     author: 'afif fudin',     title: 'Quiz icons',                     url: 'https://www.flaticon.com/free-icons/quiz' },
  { label: 'Catalogue',  author: 'Lizel Arina',    title: 'Categories icons',               url: 'https://www.flaticon.com/free-icons/categories' },
  { label: 'Trophée',    author: 'Muhammad Atif',  title: 'Trophy icons',                   url: 'https://www.flaticon.com/free-icons/trophy' },
  { label: 'Défi',       author: 'Freepik',        title: 'Target icons',                   url: 'https://www.flaticon.com/free-icons/target' },
  { label: 'Infini',     author: 'Khoirul Huda',   title: 'Infinite icons',                 url: 'https://www.flaticon.com/free-icons/infinite' },
  { label: 'Soirée',     author: 'gravisio',       title: 'Celebrating icons',              url: 'https://www.flaticon.com/free-icons/celebrating' },
  { label: 'Clavier',    author: 'afif fudin',     title: 'Electric keyboard icons',        url: 'https://www.flaticon.com/free-icons/electric-keyboard' },
  { label: 'QCM',        author: 'Freepik',        title: 'Exam icons',                     url: 'https://www.flaticon.com/free-icons/exam' },
  { label: 'Vie',        author: 'Freepik',        title: 'Pixel icons',                    url: 'https://www.flaticon.com/free-icons/pixel' },
  { label: 'Cadenas',    author: 'meaicon',        title: 'Encryption icons',               url: 'https://www.flaticon.com/free-icons/encryption' },
  { label: 'Micro',      author: 'gravisio',       title: 'Performing arts icons',          url: 'https://www.flaticon.com/free-icons/performing-arts' },
  { label: 'Réessayer',  author: 'kliwir art',     title: 'Reload icons',                   url: 'https://www.flaticon.com/free-icons/reload' },
  { label: 'Game Over',  author: 'Graphix Dxinerz',title: 'Lost icons',                     url: 'https://www.flaticon.com/free-icons/lost' },
  { label: 'Note',       author: 'Dragon Icons',   title: 'Quaver icons',                   url: 'https://www.flaticon.com/free-icons/quaver' },
  { label: 'Premium',    author: 'Talha Dogar',    title: 'Premium quality icons',          url: 'https://www.flaticon.com/free-icons/premium-quality' },
];

const CAT_CREDITS = [
  { label: 'Anime',         author: 'Us and Up',      title: 'Japan icons',                    url: 'https://www.flaticon.com/free-icons/japan' },
  { label: 'Séries',        author: 'meaicon',        title: 'Broadcast icons',                url: 'https://www.flaticon.com/free-icons/broadcast' },
  { label: 'Dessins animés',author: 'Icon.doit',      title: 'Male cartoon icons',             url: 'https://www.flaticon.com/free-icons/male-cartoon' },
  { label: 'Jeux Vidéo',    author: 'meaicon',        title: 'Arcade icons',                   url: 'https://www.flaticon.com/free-icons/arcade' },
  { label: 'Films',         author: 'meaicon',        title: 'Scene icons',                    url: 'https://www.flaticon.com/free-icons/scene' },
  { label: 'Pubs',          author: 'Chattapat.k',    title: 'Social media marketing icons',   url: 'https://www.flaticon.com/free-icons/social-media-marketing' },
  { label: 'Répliques',     author: 'Us and Up',      title: 'Motivational speech icons',      url: 'https://www.flaticon.com/free-icons/motivational-speech' },
  { label: 'TV Show',       author: 'gravisio',       title: 'Performing arts icons',          url: 'https://www.flaticon.com/free-icons/performing-arts' },
  { label: 'Animation',     author: 'Muhammad Ali',   title: 'Princess icons',                 url: 'https://www.flaticon.com/free-icons/princess' },
];

function CreditRow({ label, author, title, url }: { label: string; author: string; title: string; url: string }) {
  return (
    <TouchableOpacity style={styles.creditRow} onPress={() => Linking.openURL(url)} activeOpacity={0.7}>
      <View style={styles.creditLeft}>
        <Text style={styles.creditLabel}>{label}</Text>
        <Text style={styles.creditTitle}>{title}</Text>
      </View>
      <Text style={styles.creditAuthor}>{author} ↗</Text>
    </TouchableOpacity>
  );
}

export default function LegalScreen() {
  const insets = useSafeAreaInsets();
  useEffect(() => { loadSounds(); }, []);

  return (
    <MeshBackground>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => { playPrevious(); router.back(); }} activeOpacity={0.7}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mentions légales</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40 }]}>

        {/* CGU */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Conditions Générales d'Utilisation</Text>
          <Text style={styles.cardText}>
            En utilisant Talaref, vous acceptez sans réserve les présentes conditions. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.{'\n\n'}
            <Text style={styles.cardBold}>1. Objet{'\n'}</Text>
            Talaref est une application de jeu de type blindtest destinée à un usage personnel et récréatif. L'application permet d'identifier des extraits sonores issus de diverses œuvres culturelles.{'\n\n'}
            <Text style={styles.cardBold}>2. Accès et compte{'\n'}</Text>
            L'inscription nécessite une adresse e-mail valide. Vous êtes responsable de la confidentialité de votre mot de passe et de toute activité effectuée depuis votre compte. L'application est réservée aux personnes âgées de 13 ans ou plus.{'\n\n'}
            <Text style={styles.cardBold}>3. Contenu audio — droits des tiers{'\n'}</Text>
            Les extraits sonores diffusés dans Talaref sont des œuvres appartenant à leurs auteurs, artistes et ayants droit respectifs. Talaref ne revendique aucun droit de propriété sur ces œuvres. Les extraits sont utilisés dans un but d'identification ludique, limités à de courtes durées, et ne se substituent pas à l'écoute des œuvres originales.{'\n\n'}
            <Text style={styles.cardBold}>4. Signalement et retrait (Notice & Takedown){'\n'}</Text>
            Si vous êtes titulaire de droits sur une œuvre diffusée dans l'application et souhaitez son retrait, contactez-nous à ecchoguess@gmail.com en précisant :{'\n'}
            • Le titre et l'artiste de l'œuvre concernée{'\n'}
            • Votre qualité (auteur, éditeur, mandataire…){'\n'}
            • Tout élément justifiant vos droits{'\n\n'}
            Nous accuserons réception sous 24 heures et procéderons au retrait du contenu concerné dans un délai de 48 heures ouvrées suivant la confirmation de votre demande.{'\n\n'}
            <Text style={styles.cardBold}>5. Interdictions{'\n'}</Text>
            Il est interdit d'utiliser l'application à des fins illicites, de tenter d'en extraire le contenu audio, de le reproduire ou de le redistribuer, et de porter atteinte au bon fonctionnement des serveurs.{'\n\n'}
            <Text style={styles.cardBold}>6. Limitation de responsabilité{'\n'}</Text>
            Talaref est fourni "en l'état". L'éditeur ne garantit pas une disponibilité continue du service et ne saurait être tenu responsable de toute interruption, perte de données ou dommage indirect lié à l'utilisation de l'application.{'\n\n'}
            <Text style={styles.cardBold}>7. Modifications{'\n'}</Text>
            L'éditeur se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront informés des changements significatifs. La poursuite de l'utilisation après modification vaut acceptation.{'\n\n'}
            <Text style={styles.cardBold}>8. Droit applicable{'\n'}</Text>
            Les présentes conditions sont régies par le droit français. Tout litige relève de la compétence des tribunaux compétents de France.
          </Text>
        </View>

        {/* Politique de confidentialité */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Politique de confidentialité</Text>
          <Text style={styles.cardText}>
            <Text style={styles.cardBold}>Données collectées{'\n'}</Text>
            Talaref collecte uniquement les données nécessaires au fonctionnement : adresse e-mail, pseudo et avatar (optionnel). Aucune donnée de localisation ni donnée sensible n'est collectée.{'\n\n'}
            <Text style={styles.cardBold}>Hébergement{'\n'}</Text>
            Les données sont hébergées sur Supabase (infrastructure Amazon Web Services, région Europe) et ne sont jamais revendues ni transmises à des tiers à des fins commerciales.{'\n\n'}
            <Text style={styles.cardBold}>Vos droits (RGPD){'\n'}</Text>
            Conformément au Règlement Général sur la Protection des Données, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à ecchoguess@gmail.com. Nous répondrons dans un délai de 30 jours.{'\n\n'}
            <Text style={styles.cardBold}>Classement public{'\n'}</Text>
            Les scores et statistiques de jeu sont conservés pour alimenter le classement. Votre pseudo y est visible par les autres utilisateurs. Vous pouvez demander sa suppression à tout moment.{'\n\n'}
            <Text style={styles.cardBold}>Durée de conservation{'\n'}</Text>
            Les données sont conservées tant que votre compte est actif. En cas de suppression du compte, l'ensemble de vos données personnelles est effacé sous 30 jours.
          </Text>
        </View>

        {/* Crédits icônes UI */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crédits — Icônes UI</Text>
          <Text style={styles.cardSub}>Toutes les icônes proviennent de Flaticon.com</Text>
          <View style={styles.creditList}>
            {UI_CREDITS.map((c) => (
              <CreditRow key={c.label} {...c} />
            ))}
          </View>
        </View>

        {/* Crédits icônes catégories */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Crédits — Icônes Catégories</Text>
          <Text style={styles.cardSub}>Toutes les icônes proviennent de Flaticon.com</Text>
          <View style={styles.creditList}>
            {CAT_CREDITS.map((c) => (
              <CreditRow key={c.label} {...c} />
            ))}
          </View>
        </View>

        {/* Contact */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Contact</Text>
          <TouchableOpacity onPress={() => Linking.openURL('mailto:ecchoguess@gmail.com')} activeOpacity={0.7}>
            <Text style={styles.contactLink}>✉️ ecchoguess@gmail.com</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
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
  headerTitle: {
    flex: 1,
    color: Colors.text,
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: -0.3,
  },

  container: { padding: 16, gap: 12 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: 18,
    gap: 10,
  },
  cardTitle: { color: Colors.text, fontSize: 15, fontWeight: '800' },
  cardSub: { color: Colors.textMuted, fontSize: 12, marginTop: -4 },
  cardText: { color: Colors.textMuted, fontSize: 13, lineHeight: 21 },
  cardBold: { color: Colors.text, fontWeight: '700' },

  creditList: { gap: 2 },
  creditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  creditLeft: { gap: 2, flex: 1 },
  creditLabel: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  creditTitle: { color: Colors.outline, fontSize: 11 },
  creditAuthor: { color: Colors.primary, fontSize: 12, fontWeight: '600' },

  contactLink: { color: Colors.primary, fontSize: 14, fontWeight: '600' },
});
