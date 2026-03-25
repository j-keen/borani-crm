import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

async function getOrCreateProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<User | null> {
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (data) return data as User;

  const { data: created, error } = await supabase
    .from('users')
    .insert({
      id: authUser.id,
      email: authUser.email || '',
      name: (authUser.user_metadata?.name as string) || authUser.email?.split('@')[0] || '사용자',
      role: 'staff',
      view_scope: 'own',
    })
    .select()
    .single();

  if (error) {
    console.error('프로필 생성 실패:', error);
    return null;
  }
  return created as User;
}

export function useAuth() {
  const { currentUser, setCurrentUser, setUsers, setStatusOptions, setCustomFields } = useAppStore();
  const [loading, setLoading] = useState(true);

  const loadAppData = useCallback(async () => {
    const [statusRes, fieldsRes, usersRes] = await Promise.all([
      supabase.from('status_options').select('*').order('sort_order'),
      supabase.from('custom_fields').select('*').order('sort_order'),
      supabase.from('users').select('*').order('name'),
    ]);
    if (statusRes.data) setStatusOptions(statusRes.data);
    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (usersRes.data) setUsers(usersRes.data);
  }, [setStatusOptions, setCustomFields, setUsers]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function initializeSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session?.user) {
          const profile = await getOrCreateProfile(session.user);
          if (mounted && profile) {
            setCurrentUser(profile);
            await loadAppData();
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // 초기 세션 명시적 확인 (무한 로딩 방지)
    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION은 initializeSession에서 이미 처리됨
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          return;
        }

        if (session?.user) {
          // 토큰 갱신(TOKEN_REFRESHED) 시에는 기존 정보를 유지하여 불필요한 네트워크 요청 및 튕김 방지
          if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
            const profile = await getOrCreateProfile(session.user);
            if (profile) {
              setCurrentUser(profile);
              loadAppData().catch(console.error);
            }
          }
        } else {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setCurrentUser, loadAppData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return { currentUser, loading, signIn, signUp, signOut, loadAppData };
}
