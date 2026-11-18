import Purchases, { PurchasesPackage, CustomerInfo } from 'react-native-purchases';
import { supabase } from './supabase';

export async function getOfferings(): Promise<PurchasesPackage[]> {
  const offerings = await Purchases.getOfferings();
  return offerings.current?.availablePackages ?? [];
}

export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export function isPremium(customerInfo: CustomerInfo): boolean {
  return typeof customerInfo.entitlements.active['premium'] !== 'undefined';
}

export async function syncPremiumToSupabase(userId: string, customerInfo: CustomerInfo) {
  const premium = isPremium(customerInfo);
  await supabase.from('profiles').update({ is_premium: premium }).eq('id', userId);
}

export async function getCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}
