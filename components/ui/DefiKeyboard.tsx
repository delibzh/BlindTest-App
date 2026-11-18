import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Colors } from '@/constants/colors';
import { playKey, playClick } from '@/lib/sounds';

const { width: W } = Dimensions.get('window');
const PAD = 12;
const GAP = 5;
const ROW1 = ['A', 'Z', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'];
const KEY_W = Math.floor((W - PAD * 2 - GAP * (ROW1.length - 1)) / ROW1.length);
const KEY_H = 44;

const ROW2 = ['Q', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'M'];
const ROW3 = ['W', 'X', 'C', 'V', 'B', 'N'];
const ROWS = [ROW1, ROW2, ROW3];


interface Props {
  onKey: (char: string) => void;
  onDelete: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
}

export function DefiKeyboard({ onKey, onDelete, onSubmit, canSubmit }: Props) {
  return (
    <View style={styles.container}>
      {ROWS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {ri === 2 && (
            <TouchableOpacity
              style={[styles.key, styles.deleteKey, { height: KEY_H }]}
              onPress={() => { playKey(); onDelete(); }}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>⌫</Text>
            </TouchableOpacity>
          )}
          {row.map((char) => (
            <TouchableOpacity
              key={char}
              style={[styles.key, { width: KEY_W, height: KEY_H }]}
              onPress={() => { playKey(); onKey(char); }}
              activeOpacity={0.6}
            >
              <Text style={styles.keyText}>{char}</Text>
            </TouchableOpacity>
          ))}
          {ri === 2 && <View style={styles.deleteKey} />}
        </View>
      ))}

      <View style={styles.bottomRow}>
        <TouchableOpacity style={[styles.key, styles.spaceKey]} onPress={() => { playKey(); onKey(' '); }} activeOpacity={0.6}>
          <Text style={styles.keyText}>ESPACE</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.key, styles.submitKey, !canSubmit && styles.submitDisabled]}
          onPress={() => { playClick(); onSubmit(); }}
          disabled={!canSubmit}
          activeOpacity={0.6}
        >
          <Text style={styles.submitText}>✓ VALIDER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: GAP, paddingHorizontal: PAD },
  row: { flexDirection: 'row', gap: GAP, justifyContent: 'center' },
  key: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  deleteKey: { flex: 1, backgroundColor: Colors.background, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
keyText: { color: Colors.text, fontSize: 14, fontWeight: '600' },
  bottomRow: { flexDirection: 'row', gap: GAP },
  spaceKey: { flex: 2, height: KEY_H },
  submitKey: { flex: 1, height: KEY_H, backgroundColor: Colors.primary, borderColor: Colors.primary },
  submitDisabled: { opacity: 0.35 },
  submitText: { color: '#fff', fontSize: 13, fontWeight: '800' },
});
