import { Platform } from 'react-native';
import {
  InterstitialAd,
  RewardedAd,
  AdEventType,
  RewardedAdEventType,
  TestIds,
} from 'react-native-google-mobile-ads';

const INTERSTITIAL_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS!
    : process.env.EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID!;

const REWARDED_ID = __DEV__
  ? TestIds.REWARDED
  : Platform.OS === 'ios'
    ? process.env.EXPO_PUBLIC_ADMOB_REWARDED_IOS!
    : process.env.EXPO_PUBLIC_ADMOB_REWARDED_ANDROID!;

const PARTY_AD_EVERY = 15;

// ── Interstitial ──────────────────────────────────────────────────────────

function makeInterstitial() {
  const ad = InterstitialAd.createForAdRequest(INTERSTITIAL_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  ad.addAdEventListener(AdEventType.LOADED, () => {
    interstitialState.loaded = true;
  });
  let retryPending = false;
  ad.addAdEventListener(AdEventType.ERROR, (e) => {
    console.warn('[Ads] Interstitial load error:', e);
    interstitialState.loaded = false;
    if (!retryPending) {
      retryPending = true;
      setTimeout(() => {
        retryPending = false;
        interstitialState.ad.load();
      }, 10000);
    }
  });
  ad.addAdEventListener(AdEventType.CLOSED, () => {
    interstitialState.loaded = false;
    interstitialState.ad = makeInterstitial();
    interstitialState.ad.load();
  });
  return ad;
}

const interstitialState = { ad: makeInterstitial(), loaded: false };

export function preloadInterstitial() {
  if (!interstitialState.loaded) interstitialState.ad.load();
}

// Soirée / Buzz / Confiance — compteur indépendant par mode, pub toutes les 15 musiques
const partyCounters: Record<string, number> = {};

export async function trackPartySound(mode: string, isPremium: boolean): Promise<void> {
  if (isPremium) return;
  partyCounters[mode] = (partyCounters[mode] ?? 0) + 1;
  if (__DEV__) console.log(`[Ads] ${mode} counter: ${partyCounters[mode]}/${PARTY_AD_EVERY} loaded:${interstitialState.loaded}`);
  if (partyCounters[mode] >= PARTY_AD_EVERY) {
    partyCounters[mode] = 0;
    if (interstitialState.loaded) {
      await new Promise<void>((resolve) => {
        const unsub = interstitialState.ad.addAdEventListener(AdEventType.CLOSED, () => {
          unsub();
          resolve();
        });
        interstitialState.ad.show().catch(() => { unsub(); resolve(); });
      });
    } else {
      interstitialState.ad.load();
    }
  }
}

// ── Rewarded ──────────────────────────────────────────────────────────────

function makeRewarded() {
  const ad = RewardedAd.createForAdRequest(REWARDED_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
  ad.addAdEventListener(RewardedAdEventType.LOADED, () => { rewardedState.loaded = true; });
  return ad;
}

const rewardedState = { ad: makeRewarded(), loaded: false };

export function preloadRewarded() {
  if (!rewardedState.loaded) rewardedState.ad.load();
}

// Retourne true si la récompense a été gagnée (joueur a regardé jusqu'au bout)
export function showRewardedAd(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!rewardedState.loaded) { resolve(false); return; }

    let rewarded = false;

    const unsubEarned = rewardedState.ad.addAdEventListener(
      RewardedAdEventType.EARNED_REWARD,
      () => { rewarded = true; }
    );

    const unsubClosed = rewardedState.ad.addAdEventListener(
      AdEventType.CLOSED,
      () => {
        unsubEarned();
        unsubClosed();
        rewardedState.loaded = false;
        rewardedState.ad = makeRewarded();
        rewardedState.ad.load();
        resolve(rewarded);
      }
    );

    rewardedState.ad.show().catch(() => {
      unsubEarned();
      unsubClosed();
      resolve(false);
    });
  });
}
