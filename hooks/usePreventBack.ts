import { useRef, useEffect, useCallback } from 'react';
import { BackHandler, Alert } from 'react-native';
import { useFocusEffect } from 'expo-router';

export function confirmQuit(onQuit: () => void) {
  Alert.alert(
    'Quitter la partie ?',
    'Ta progression ne sera pas sauvegardée.',
    [
      { text: 'Continuer', style: 'cancel' },
      { text: 'Quitter', style: 'destructive', onPress: onQuit },
    ]
  );
}

export function usePreventBack(onQuit: () => void) {
  const ref = useRef(onQuit);
  useEffect(() => { ref.current = onQuit; });

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        confirmQuit(() => ref.current());
        return true;
      });
      return () => sub.remove();
    }, [])
  );
}
