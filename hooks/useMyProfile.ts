import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface MyProfile {
  username: string;
  avatar_url: string | null;
  border_color: string;
  equipped_frame_id: string | null;
  equipped_badge_id: string | null;
  equipped_title_id: string | null;
  xp: number;
  level: number;
}

const DEFAULT: MyProfile = {
  username: '',
  avatar_url: null,
  border_color: '#a855f7',
  equipped_frame_id: null,
  equipped_badge_id: null,
  equipped_title_id: null,
  xp: 0,
  level: 1,
};

export function useMyProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    setLoading(true);
    supabase
      .from('profiles')
      .select('username, avatar_url, border_color, equipped_frame_id, equipped_badge_id, equipped_title_id, xp, level')
      .eq('id', user.id)
      .single()
      .then(({ data, error }) => {
        if (error) throw error;
        if (data) setProfile({ ...DEFAULT, ...data });
      })
      .catch(() => setProfile(DEFAULT))
      .finally(() => setLoading(false));
  }, [user?.id]);

  return { profile, loading };
}
