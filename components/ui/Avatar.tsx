import { View, Image, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/colors';

const FRAME_STYLES: Record<string, { borderWidth: number; shadowOpacity: number; shadowRadius: number }> = {
  frame_default:     { borderWidth: 2,   shadowOpacity: 0,    shadowRadius: 0  },
  frame_silver:      { borderWidth: 2.5, shadowOpacity: 0.25, shadowRadius: 6  },
  frame_gold:        { borderWidth: 3,   shadowOpacity: 0.45, shadowRadius: 10 },
  frame_neon_blue:   { borderWidth: 2.5, shadowOpacity: 0.7,  shadowRadius: 14 },
  frame_neon_purple: { borderWidth: 2.5, shadowOpacity: 0.7,  shadowRadius: 14 },
  frame_legendary:   { borderWidth: 3.5, shadowOpacity: 0.9,  shadowRadius: 18 },
};

const BADGE_EMOJI: Record<string, string> = {
  badge_fire:    '🔥',
  badge_star:    '⭐',
  badge_crown:   '👑',
  badge_diamond: '💎',
};

interface Props {
  uri?: string | null;
  username?: string;
  size?: number;
  borderColor?: string;
  frameId?: string | null;
  badgeId?: string | null;
}

export function Avatar({ uri, username, size = 40, borderColor, frameId, badgeId }: Props) {
  const initials   = username ? username.slice(0, 2).toUpperCase() : '??';
  const radius     = size / 2;
  const frame      = FRAME_STYLES[frameId ?? 'frame_default'] ?? FRAME_STYLES.frame_default;
  const color      = borderColor ?? Colors.primary;
  const badgeEmoji = badgeId ? (BADGE_EMOJI[badgeId] ?? null) : null;
  const badgeSize  = Math.max(12, Math.round(size * 0.32));

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: radius,
    borderWidth: frame.borderWidth,
    borderColor: color,
    shadowColor: color,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: frame.shadowOpacity,
    shadowRadius: frame.shadowRadius,
    elevation: frame.shadowOpacity > 0 ? 4 : 0,
  };

  const inner = uri
    ? <Image source={{ uri }} style={{ width: '100%', height: '100%', borderRadius: radius - frame.borderWidth }} />
    : (
      <View style={[styles.placeholder, { borderRadius: radius - frame.borderWidth }]}>
        <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
      </View>
    );

  if (!badgeEmoji) {
    return <View style={[styles.wrap, containerStyle]}>{inner}</View>;
  }

  return (
    <View style={{ width: size, height: size }}>
      <View style={[styles.wrap, containerStyle]}>{inner}</View>
      <View style={[styles.badgeWrap, { width: badgeSize, height: badgeSize, bottom: -badgeSize * 0.15, right: -badgeSize * 0.15 }]}>
        <Text style={{ fontSize: badgeSize * 0.75, lineHeight: badgeSize }}>{badgeEmoji}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  placeholder: {
    flex: 1,
    width: '100%',
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { color: Colors.primary, fontWeight: '700' },
  badgeWrap: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
