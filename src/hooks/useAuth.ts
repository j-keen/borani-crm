import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

const SESSION_TIMEOUT_MS = 15000;
const PROFILE_TIMEOUT_MS = 10000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}: ${ms}ms 초과`)), ms)
    ),
  ]);
}

async function getOrCreateProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<User | null> {
  const { data, error: selectError } = await withTimeout(
    supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle(),
    PROFILE_TIMEOUT_MS,
    '프로필 조회',
  );

  if (selectError) {
    console.error('프로필 조회 실패:', selectError);
    return null;
  }

  if (data) return data as User;

  // DB 트리거(handle_new_user)가 프로필을 아직 생성하지 않은 경우 대비
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
    console.error('프로필 생성 실패 (RLS 또는 트리거 확인 필요):', error);
    // 트리거가 이미 생성했을 수 있으므로 한번 더 조회
    const { data: retryData } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();
    return retryData as User | null;
  }
  return created as User;
}

export function useAuth() {
  const { currentUser, setCurrentUser, setUsers, setStatusOptions, setCustomFields } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

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
        const { data: { session }, error } = await withTimeout(
          supabase.auth.getSession(),
          SESSION_TIMEOUT_MS,
          '세션 확인',
        );

        if (error) {
          console.error('세션 확인 실패:', error);
          // stale 세션 정리
          await supabase.auth.signOut().catch(() => {});
          return;
        }

        if (session?.user) {
          const profile = await getOrCreateProfile(session.user);
          if (mounted && profile) {
            setCurrentUser(profile);
            await loadAppData();
          } else if (mounted && !profile) {
            console.warn('프로필을 찾을 수 없음. 로그인 화면으로 이동합니다.');
          }
        }
      } catch (err) {
        console.error('세션 초기화 오류:', err);
        if (mounted) {
          const msg = err instanceof Error ? err.message : '알 수 없는 오류';
          setAuthError(msg);
          // 타임아웃인 경우 stale 세션 정리
          if (msg.includes('초과')) {
            await supabase.auth.signOut().catch(() => {});
          }
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initializeSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'INITIAL_SESSION') return;

        if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
          setAuthError(null);
          return;
        }

        if (session?.user) {
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
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setAuthError(null);
  };

  return { currentUser, loading, authError, signIn, signUp, signOut, loadAppData };
}
