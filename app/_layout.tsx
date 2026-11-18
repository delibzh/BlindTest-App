import { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';
import { Colors } from '@/constants/colors';
import { preloadInterstitial, preloadRewarded } from '@/lib/ads';
import { supabase } from '@/lib/supabase';
import MobileAds from 'react-native-google-mobile-ads';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Masquer le splash natif immédiatement — le SplashLoader custom prend le relais
    SplashScreen.hideAsync().catch(() => {});

    async function init() {
      try {
        Purchases.setLogLevel(LOG_LEVEL.VERBOSE);

        const key = Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_RC_KEY_IOS!
          : process.env.EXPO_PUBLIC_RC_KEY_ANDROID!;

        if (key) Purchases.configure({ apiKey: key });

        await supabase.auth.getSession();
        await MobileAds().initialize();
      } catch (e) {
        console.warn('[Init] error:', e);
      } finally {
        setReady(true);
      }

      setTimeout(() => {
        preloadInterstitial();
        preloadRewarded();
      }, 1000);
    }

    init();
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: '#0B051D' }} />;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      />
    </>
  );
}
