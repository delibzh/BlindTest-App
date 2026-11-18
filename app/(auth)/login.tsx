import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { signIn } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { AudioSpectrum } from '@/components/ui/AudioSpectrum';

export default function LoginScreen() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleLogin() {
    if (!email || !password) { setError('Remplis tous les champs'); return; }
    setError('');
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(app)/home');
    } catch (e: any) {
      setError(e.message ?? 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <MeshBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.spectrumWrap} pointerEvents="none">
              <AudioSpectrum size={200} radius={88} color={Colors.primary} />
            </View>
            <Text style={styles.title}>Talaref</Text>
            <Text style={styles.subtitle}>Si tu l'as, tu régales !</Text>
          </View>

          {/* Formulaire */}
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Connexion</Text>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="ton@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Input
              label="Mot de passe"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button label="Se connecter" onPress={handleLogin} loading={loading} />
            <Link href="/(auth)/register" asChild>
              <Button label="Pas encore de compte ? S'inscrire" onPress={() => {}} variant="ghost" />
            </Link>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 32 },

  hero: { alignItems: 'center', gap: 8 },
  spectrumWrap: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { color: Colors.text, fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  subtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },

  formCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    padding: 24, gap: 14,
  },
  formTitle: { color: Colors.text, fontSize: 18, fontWeight: '800', marginBottom: 4 },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center' },
});
