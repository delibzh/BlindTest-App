import { useState, useEffect } from 'react';
import { CustomerInfo } from 'react-native-purchases';
import { getCustomerInfo, isPremium } from '@/lib/purchases';

export function usePremium() {
  const [premium, setPremium] = useState(false);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (__DEV__) {
      setPremium(true);
      setLoading(false);
      return;
    }

    getCustomerInfo()
      .then((info) => {
        setCustomerInfo(info);
        setPremium(isPremium(info));
      })
      .catch(() => setPremium(false))
      .finally(() => setLoading(false));
  }, []);

  return { premium, customerInfo, loading };
}
