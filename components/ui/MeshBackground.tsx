import { StyleSheet, View } from 'react-native';
import { Colors } from '@/constants/colors';
import { WaveBackground } from './WaveBackground';

export function MeshBackground({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <WaveBackground />
      <View style={styles.veil} pointerEvents="none" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  veil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,5,29,0.62)' },
});
