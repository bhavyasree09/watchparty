import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  profile: any | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setProfile: (profile: any | null) => void;
  setLoading: (loading: boolean) => void;
  signOut: () => Promise<void>;
  initialized: boolean;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },
}));

// Initialize auth listener and restore session
let isFirstLoad = true;
supabase.auth.onAuthStateChange(async (event, session) => {
  const user = session?.user ?? null;
  useAuthStore.getState().setUser(user);

  if (user) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Supabase: failed to fetch profile', error);
        useAuthStore.getState().setProfile(null);
      } else if (!data) {
        // No profile exists yet for this user — create one from available metadata
        const username = (user?.email && user.email.split('@')[0]) || `user-${user.id.slice(0, 8)}`;
        const { data: newProfile, error: upsertError } = await supabase
          .from('profiles')
          .insert({ id: user.id, username })
          .select()
          .maybeSingle();

        if (upsertError) {
          console.error('Supabase: failed to create profile', upsertError);
          useAuthStore.getState().setProfile(null);
        } else {
          useAuthStore.getState().setProfile(newProfile);
        }
      } else {
        useAuthStore.getState().setProfile(data);
      }
    } catch (err) {
      console.error('Supabase: unexpected error fetching profile', err);
      useAuthStore.getState().setProfile(null);
    }
  } else {
    useAuthStore.getState().setProfile(null);
  }

  // Mark as initialized after first load
  if (isFirstLoad) {
    isFirstLoad = false;
    useAuthStore.setState({ initialized: true });
  }

  useAuthStore.setState({ loading: false });
});
