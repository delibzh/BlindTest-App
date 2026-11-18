import { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, FlatList } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { useAuth } from '@/hooks/useAuth';
import { Avatar } from '@/components/ui/Avatar';
import { Colors } from '@/constants/colors';
import { Socket } from 'socket.io-client';
import { loadSounds, playPrevious } from '@/lib/sounds';
import { MeshBackground } from '@/components/ui/MeshBackground';

interface Player {
  userId: string;
  username: string;
  avatarUrl?: string;
  isReady: boolean;
}

export default function SalonLobbyScreen() {
  const { sessionId, isGm, categories, count, scoringMode } = useLocalSearchParams<{
    sessionId: string; isGm: string; categories: string; count: string; scoringMode: string;
  }>();
  const { user } = useAuth();
  const isGameMaster = isGm === 'true';

  const [players, setPlayers] = useState<Player[]>([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => { loadSounds(); }, []);

  useEffect(() => {
    const socket = connectSocket();
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('session:join', {
        sessionId,
        userId: user?.id ?? 'anonymous',
        username: user?.user_metadata?.username ?? 'Joueur',
      });
    });

    socket.on('session:updated', (session: any) => {
      setPlayers(session.players ?? []);
    });

    socket.on('game:started', () => {
      router.replace({
        pathname: '/(app)/salon-game',
        params: { sessionId, isGm: isGm, categories: categories ?? '', count: count ?? '10', scoringMode: scoringMode ?? 'auto' },
      });
    });

    socket.on('error', (msg: string) => console.warn('Socket error:', msg));

    return () => {
      socket.emit('session:leave');
      disconnectSocket();
    };
  }, []);

  async function shareCode() {
    await Share.share({ message: `Rejoins mon salon Ixde - Blindtest ! Code : ${sessionId}` });
  }

  function handleStart() {
    socketRef.current?.emit('player:ready');
  }

  return (
    <MeshBackground>
    <View style={styles.container}>
      <TouchableOpacity onPress={() => { disconnectSocket(); playPrevious(); router.back(); }} style={styles.back}>
        <Text style={styles.backText}>← Quitter</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Salon en attente</Text>

      {/* Code */}
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Code du salon</Text>
        <Text style={styles.code}>{sessionId}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Text style={styles.shareBtnText}>Partager 📤</Text>
        </TouchableOpacity>
      </View>

      {/* Statut connexion */}
      <View style={styles.statusRow}>
        <View style={[styles.dot, { backgroundColor: connected ? Colors.success : Colors.warning }]} />
        <Text style={styles.statusText}>{connected ? 'Connecté au serveur' : 'Connexion...'}</Text>
      </View>

      {/* Joueurs */}
      <Text style={styles.section}>Joueurs ({players.length}/8)</Text>
      <FlatList
        data={players}
        keyExtractor={(p) => p.userId}
        style={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>En attente de joueurs...</Text>}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Avatar username={item.username} size={36} />
            <Text style={styles.playerName}>{item.username}</Text>
            {item.isReady && <Text style={styles.ready}>✓ Prêt</Text>}
          </View>
        )}
      />

      {isGameMaster ? (
        <View style={styles.footer}>
          <Text style={styles.gmNote}>En tant que GM, tu contrôles le démarrage.</Text>
          <TouchableOpacity
            style={[styles.startBtn, players.length < 2 && styles.startBtnDisabled]}
            onPress={handleStart}
            disabled={players.length < 2}
          >
            <Text style={styles.startBtnText}>
              {players.length < 2 ? 'Attends au moins 2 joueurs' : 'Lancer la partie →'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.footer}>
          <Text style={styles.waitNote}>⏳ En attente du Game Master...</Text>
        </View>
      )}
    </View>
    </MeshBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 56, gap: 16 },
  back: { alignSelf: 'flex-start' },
  backText: { color: Colors.primary, fontSize: 16 },
  title: { color: Colors.text, fontSize: 26, fontWeight: '800' },
  codeCard: { backgroundColor: Colors.surface, borderRadius: 20, borderWidth: 1, borderColor: Colors.border, padding: 20, alignItems: 'center', gap: 10 },
  codeLabel: { color: Colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 1 },
  code: { color: Colors.primary, fontSize: 36, fontWeight: '900', letterSpacing: 6 },
  shareBtn: { backgroundColor: Colors.primary + '22', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 8, borderWidth: 1, borderColor: Colors.primary + '44' },
  shareBtnText: { color: Colors.primary, fontSize: 14, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: Colors.textMuted, fontSize: 13 },
  section: { color: Colors.textMuted, fontSize: 15, fontWeight: '600' },
  list: { flex: 1 },
  empty: { color: Colors.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
  playerRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 12, marginBottom: 8, gap: 12 },
  playerName: { flex: 1, color: Colors.text, fontSize: 15, fontWeight: '600' },
  ready: { color: Colors.success, fontSize: 13, fontWeight: '700' },
  footer: { gap: 10, paddingBottom: 8 },
  gmNote: { color: Colors.textMuted, fontSize: 13, textAlign: 'center' },
  startBtn: { backgroundColor: Colors.primary, borderRadius: 16, height: 54, alignItems: 'center', justifyContent: 'center' },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitNote: { color: Colors.textMuted, fontSize: 15, textAlign: 'center', paddingVertical: 12 },
});
