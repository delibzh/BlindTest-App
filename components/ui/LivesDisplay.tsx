import { View, Image, StyleSheet } from 'react-native';

const HEART = require('@/assets/Icon/UI/life.png');

interface Props {
  lives: number;
  total?: number;
  size?: number;
}

export function LivesDisplay({ lives, total = 3, size = 16 }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: total }, (_, i) => (
        <Image
          key={i}
          source={HEART}
          style={{ width: size, height: size, opacity: i < lives ? 1 : 0.22 }}
          resizeMode="contain"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 3 },
});
