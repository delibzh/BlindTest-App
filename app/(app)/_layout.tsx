import { useEffect, useRef, useState } from 'react';
import { View, Text, Image, StyleSheet, Animated } from 'react-native';
import { Stack, router } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { Colors } from '@/constants/colors';
import { MeshBackground } from '@/components/ui/MeshBackground';

const MIN_SPLASH_MS = 2200;

function SplashLoader() {
  const progress = useRef(new Animated.Value(0)).current;
  const dot1     = useRef(new Animated.Value(0.25)).current;
  const dot2     = useRef(new Animated.Value(0.25)).current;
  const dot3     = useRef(new Animated.Value(0.25)).current;

  useEffect(() => {
    // Barre de progression — atteint ~92% en MIN_SPLASH_MS puis stagne
    Animated.timing(progress, {
      toValue: 0.92,
      duration: MIN_SPLASH_MS - 300,
      useNativeDriver: false,
    }).start();

    // Dots séquentiels
    const runLoop = () => {
      Animated.sequence([
        Animated.timing(dot1, { toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.timing(dot2, { toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.timing(dot3, { toValue: 1,    duration: 200, useNativeDriver: true }),
        Animated.delay(120),
        Animated.parallel([
          Animated.timing(dot1, { toValue: 0.25, duration: 320, useNativeDriver: true }),
          Animated.timing(dot2, { toValue: 0.25, duration: 320, useNativeDriver: true }),
          Animated.timing(dot3, { toValue: 0.25, duration: 320, useNativeDriver: true }),
        ]),
        Animated.delay(180),
      ]).start(({ finished }) => { if (finished) runLoop(); });
    };
    runLoop();
  }, []);

  const barWidth = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  return (
    <MeshBackground>
      <View style={s.container}>
        <Image
          source={require('@/assets/Icon/UI/splash-icon.png')}
          style={s.logo}
          resizeMode="contain"
        />
        <Text style={s.title}>TALAREF</Text>
        <Text style={s.subtitle}>BLINDTEST</Text>

        {/* Barre de progression */}
        <View style={s.barTrack}>
          <Animated.View style={[s.barFill, { width: barWidth }]}>
            <View style={s.barHead} />
          </Animated.View>
        </View>

        {/* Dots */}
        <View style={s.dots}>
          {([dot1, dot2, dot3] as Animated.Value[]).map((dot, i) => (
            <Animated.View
              key={i}
              style={[
                s.dot,
                {
                  backgroundColor: [Colors.primary, Colors.secondary, Colors.tertiary][i],
                  opacity: dot,
                  transform: [{ scale: dot.interpolate({ inputRange: [0.25, 1], outputRange: [0.6, 1.3] }) }],
                },
              ]}
            />
          ))}
        </View>
      </View>
    </MeshBackground>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 48,
    gap: 6,
  },
  logo: {
    width: 104,
    height: 104,
    marginBottom: 16,
  },
  title: {
    color: Colors.text,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 6,
    textShadowColor: Colors.primary,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 32,
  },
  barTrack: {
    width: '100%',
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 3,
    overflow: 'visible',
    position: 'relative',
  },
  barHead: {
    position: 'absolute',
    right: -4,
    top: -3,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.text,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  dots: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [minReady, setMinReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinReady(true), MIN_SPLASH_MS);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!loading && !user) router.replace('/(auth)/login');
  }, [user, loading]);

  if (loading || !user || !minReady) return <SplashLoader />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="defi-game"   options={{ gestureEnabled: false }} />
      <Stack.Screen name="soiree-game" options={{ gestureEnabled: false }} />
      <Stack.Screen name="buzz-game"   options={{ gestureEnabled: false }} />
      <Stack.Screen name="infini-game" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
