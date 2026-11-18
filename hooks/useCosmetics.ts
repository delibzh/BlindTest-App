import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface CosmeticItem {
  id: string;
  type: 'frame' | 'badge' | 'title' | 'avatar_skin';
  label: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  source: 'free' | 'xp' | 'achievement' | 'premium' | 'event';
  required_xp: number | null;
  achievement_id: string | null;
  premium_only: boolean;
  sort_order: number;
}

export interface ProfileCosmetics {
  equipped_frame_id: string | null;
  equipped_badge_id: string | null;
  equipped_title_id: string | null;
  border_color: string;
  username_color: string;
  xp: number;
}

export const FREE_BORDER_COLORS   = ['#a855f7', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ffffff'];
export const PREMIUM_BORDER_COLORS = [
  '#a855f7', '#7c3aed', '#6d28d9',
  '#3b82f6', '#1d4ed8',
  '#10b981', '#059669',
  '#f59e0b', '#d97706',
  '#ef4444', '#dc2626',
  '#ec4899', '#db2777',
  '#06b6d4', '#0891b2',
  '#f97316',
  '#ffffff', '#94a3b8', '#1e293b',
];

export function isItemUnlocked(
  item: CosmeticItem,
  userXp: number,
  ownedIds: Set<string>,
  isPremium: boolean,
): boolean {
  if (item.source === 'free')        return true;
  if (item.premium_only && !isPremium) return false;
  if (item.source === 'xp')          return item.required_xp != null ? userXp >= item.required_xp : true;
  if (item.source === 'premium')     return isPremium;
  // achievement / event — stockés dans user_cosmetics
  return ownedIds.has(item.id);
}

export function lockReason(item: CosmeticItem, userXp: number, isPremium: boolean): string {
  if (item.premium_only && !isPremium) return 'Premium';
  if (item.source === 'xp' && item.required_xp && userXp < item.required_xp) {
    return `${item.required_xp} XP`;
  }
  return '';
}

export function useCosmetics() {
  const { user } = useAuth();
  const [catalogue, setCatalogue]           = useState<CosmeticItem[]>([]);
  const [profileCosmetics, setProfileCosmetics] = useState<ProfileCosmetics | null>(null);
  // ownedIds = uniquement achievement/event (pas XP, pas free, pas premium)
  const [ownedIds, setOwnedIds]             = useState<Set<string>>(new Set());
  const [loading, setLoading]               = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [catRes, profileRes, ownedRes] = await Promise.all([
        supabase.from('cosmetics').select('*').order('sort_order'),
        supabase.from('profiles')
          .select('equipped_frame_id, equipped_badge_id, equipped_title_id, border_color, username_color, xp')
          .eq('id', user.id)
          .single(),
        // Charge seulement achievement/event — XP est dynamique, premium est calculé via isPremium
        supabase.from('user_cosmetics')
          .select('cosmetic_id')
          .eq('user_id', user.id),
      ]);

      setOwnedIds(new Set((ownedRes.data ?? []).map((r: any) => r.cosmetic_id)));
      setCatalogue(catRes.data ?? []);

      if (profileRes.data) {
        setProfileCosmetics({
          equipped_frame_id: profileRes.data.equipped_frame_id ?? null,
          equipped_badge_id: profileRes.data.equipped_badge_id ?? null,
          equipped_title_id: profileRes.data.equipped_title_id ?? null,
          border_color:      profileRes.data.border_color  ?? '#a855f7',
          username_color:    profileRes.data.username_color ?? '#ffffff',
          xp:                profileRes.data.xp ?? 0,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  async function equip(
    field: 'equipped_frame_id' | 'equipped_badge_id' | 'equipped_title_id',
    id: string | null,
  ) {
    if (!user) return;
    await supabase.from('profiles').update({ [field]: id }).eq('id', user.id);
    setProfileCosmetics((prev) => prev ? { ...prev, [field]: id } : prev);
  }

  async function setColor(field: 'border_color' | 'username_color', value: string) {
    if (!user) return;
    await supabase.from('profiles').update({ [field]: value }).eq('id', user.id);
    setProfileCosmetics((prev) => prev ? { ...prev, [field]: value } : prev);
  }

  return { catalogue, profileCosmetics, ownedIds, loading, equip, setColor, reload: load };
}
