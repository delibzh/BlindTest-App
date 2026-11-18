import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

const LETTERS = ['A', 'B', 'C', 'D'];

interface Answer {
  id: string;
  label: string;
  is_correct: boolean;
}

interface Props {
  answer: Answer;
  selectedId: string | null;
  revealed: boolean;
  /** Surligne la bonne réponse en vert quand revealed=true (défaut: true). */
  highlightCorrect?: boolean;
  index?: number;
  onPress: () => void;
}

export function AnswerButton({ answer, selectedId, revealed, highlightCorrect = true, index = -1, onPress }: Props) {
  const isSelected = selectedId === answer.id;
  const isCorrectRevealed = revealed && highlightCorrect && answer.is_correct;

  let bg = 'rgba(255,255,255,0.06)';
  let border = 'rgba(255,255,255,0.15)';
  let badgeBg = Colors.surfaceHigh;
  let shadowColor = 'transparent';
  let shadowOpacity = 0;

  if (revealed) {
    if (isSelected) {
      if (answer.is_correct) {
        bg = Colors.success + '22';
        border = Colors.success;
        badgeBg = Colors.success;
        shadowColor = Colors.success;
        shadowOpacity = 0.4;
      } else {
        bg = Colors.error + '18';
        border = Colors.error + 'AA';
        badgeBg = Colors.error;
        shadowColor = Colors.error;
        shadowOpacity = 0.3;
      }
    } else if (isCorrectRevealed) {
      bg = Colors.success + '18';
      border = Colors.success + '88';
      badgeBg = Colors.success + '55';
    }
  }

  const letter = index >= 0 ? LETTERS[index] ?? '' : '';

  return (
    <TouchableOpacity
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: border },
        shadowOpacity > 0 && {
          shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity,
          shadowRadius: 12,
          elevation: 4,
        },
      ]}
      onPress={onPress}
      disabled={revealed}
      activeOpacity={0.8}
    >
      {letter ? (
        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
          <Text style={styles.badgeText}>{letter}</Text>
        </View>
      ) : null}
      <Text style={[styles.text, !letter && styles.textCentered]}>{answer.label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  badge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  badgeText: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  text: {
    color: Colors.text,
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
  },
  textCentered: {
    textAlign: 'center',
  },
});
