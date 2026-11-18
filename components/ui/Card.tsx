import { View, StyleSheet, ViewStyle } from 'react-native';

interface Props {
  children: React.ReactNode;
  style?: ViewStyle;
  glow?: 'primary' | 'secondary' | 'tertiary';
}

export function Card({ children, style, glow }: Props) {
  const glowColors = {
    primary: { shadowColor: '#bd00ff', borderColor: 'rgba(189,0,255,0.35)' },
    secondary: { shadowColor: '#00eefc', borderColor: 'rgba(0,238,252,0.35)' },
    tertiary: { shadowColor: '#e7006e', borderColor: 'rgba(231,0,110,0.35)' },
  };
  const glowStyle = glow ? glowColors[glow] : {};
  return (
    <View
      style={[
        styles.card,
        glow && {
          borderColor: glowStyle.borderColor,
          shadowColor: glowStyle.shadowColor,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 16,
          elevation: 8,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 16,
  },
});
