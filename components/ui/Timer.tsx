import { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors } from '@/constants/colors';

interface Props {
  durationMs: number;
  onEnd?: () => void;
  running?: boolean;
}

export function Timer({ durationMs, onEnd, running = true }: Props) {
  const progress = useRef(new Animated.Value(1)).current;
  const animation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!running) { animation.current?.stop(); return; }

    progress.setValue(1);
    animation.current = Animated.timing(progress, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: false,
    });
    animation.current.start(({ finished }) => { if (finished) onEnd?.(); });

    return () => animation.current?.stop();
  }, [running, durationMs]);

  const barColor = progress.interpolate({
    inputRange: [0, 0.3, 1],
    outputRange: [Colors.error, Colors.tertiary, Colors.secondary],
  });

  const widthPercent = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.track}>
      <Animated.View style={[styles.bar, { width: widthPercent, backgroundColor: barColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 8,
    backgroundColor: Colors.surfaceHighest,
    borderRadius: 4,
    overflow: 'hidden',
  },
  bar: { height: '100%', borderRadius: 4 },
});
