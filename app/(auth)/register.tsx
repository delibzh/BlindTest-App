import { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Link, router } from 'expo-router';
import { signUp } from '@/lib/auth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';
import { AudioSpectrum } from '@/components/ui/AudioSpectrum';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleRegister() {
    if (!username || !email || !password) { setError('Remplis tous les champs'); return; }
    if (password.length < 6) { setError('Mot de passe trop court (6 caractères min)'); return; }
    setError('');
    setLoading(true);
    try {
      await signUp(email.trim(), password, username.trim());
      setDone(true);
    } catch (e: any) {
      setError(e.message ?? 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <MeshBackground>
        <View style={styles.container}>
          <Text style={styles.doneEmoji}>✉️</Text>
          <Text style={styles.title}>Vérifie ton email</Text>
          <Text style={styles.subtitle}>Un lien de confirmation a été envoyé à {email}</Text>
          <Link href="/(auth)/login" asChild>
            <Button label="Retour à la connexion" onPress={() => {}} style={{ marginTop: 24 }} />
          </Link>
        </View>
      </MeshBackground>
    );
  }

  return (
    <MeshBackground>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

          <View style={styles.hero}>
            <View style={styles.spectrumWrap} pointerEvents="none">
              <AudioSpectrum size={160} radius={68} color={Colors.secondary} />
            </View>
            <Text style={styles.title}>Créer un compte</Text>
          </View>

          <View style={styles.form}>
          <Input label="Pseudo" value={username} onChangeText={setUsername} placeholder="GamerTag42" autoCapitalize="none" />
          <Input label="Email" value={email} onChangeText={setEmail} placeholder="ton@email.com" keyboardType="email-address" autoCapitalize="none" />
          <Input label="Mot de passe" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="S'inscrire" onPress={handleRegister} loading={loading} />
          <Link href="/(auth)/login" asChild>
            <Button label="Déjà un compte ? Se connecter" onPress={() => {}} variant="ghost" />
          </Link>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  hero: { alignItems: 'center', gap: 8 },
  spectrumWrap: { width: 160, height: 160, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  doneEmoji: { fontSize: 64 },
  title: { color: Colors.text, fontSize: 30, fontWeight: '800', letterSpacing: -1 },
  subtitle: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },
  form: { width: '100%', gap: 14 },
  error: { color: Colors.error, fontSize: 13, textAlign: 'center' },
});
