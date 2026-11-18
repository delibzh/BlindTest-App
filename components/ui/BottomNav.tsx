import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/colors';

const TABS = [
  { label: 'Play',       emoji: '▶', path: '/home'        },
  { label: 'Classement', emoji: '★', path: '/leaderboard' },
  { label: 'Collection', emoji: '◈', path: '/boutique'    },
  { label: 'Profil',     emoji: '◎', path: '/profile'     },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  function navigate(path: string) {
    if (!pathname.endsWith(path)) {
      router.replace(`/(app)${path}` as any);
    }
  }

  return (
    <View style={[styles.nav, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((tab) => {
        const active = pathname.endsWith(tab.path);
        return (
          <TouchableOpacity
            key={tab.path}
            style={styles.tab}
            onPress={() => navigate(tab.path)}
            activeOpacity={0.7}
          >
            <Text style={[styles.icon, active && styles.iconActive]}>{tab.emoji}</Text>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {active && <View style={styles.activeLine} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    backgroundColor: 'rgba(34,28,53,0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.10)',
    paddingTop: 10,
    paddingHorizontal: 8,
    justifyContent: 'space-around',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  icon: {
    fontSize: 18,
    color: Colors.outline,
    lineHeight: 24,
  },
  iconActive: {
    color: Colors.primary,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.outline,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  labelActive: {
    color: Colors.primary,
  },
  activeLine: {
    position: 'absolute',
    top: -10,
    width: 24,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
  },
});
