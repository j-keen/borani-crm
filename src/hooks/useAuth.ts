import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

// users 테이블에서 프로필 조회, 없으면 자동 생성
async function getOrCreateProfile(authUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }): Promise<User | null> {
  // 1. 기존 프로필 조회
  const { data } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .maybeSingle();

  if (data) return data as User;

  // 2. 프로필이 없으면 생성 (트리거 실패 대비)
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
    let didTimeout = false;
    const timeout = setTimeout(() => {
      didTimeout = true;
      console.warn('Auth 초기화 타임아웃 (5초)');
      setLoading(false);
    }, 5000);

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await getOrCreateProfile(session.user);
          if (profile) {
            setCurrentUser(profile);
            await loadAppData();
          }
        }
      } catch (e) {
        console.error('Auth 초기화 실패:', e);
      } finally {
        clearTimeout(timeout);
        if (!didTimeout) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        if (session?.user) {
          const profile = await getOrCreateProfile(session.user);
          if (profile) {
            setCurrentUser(profile);
            await loadAppData();
          }
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error('Auth 상태 변경 처리 실패:', e);
      }
    });

    return () => subscription.unsubscribe();
  }, [setCurrentUser, loadAppData]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('로그인 요청 시간 초과 — Supabase 연결을 확인해주세요.')), 10000)),
      ]);
      return { error };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e : new Error('알 수 없는 오류') };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { error } = await Promise.race([
        supabase.auth.signUp({ email, password, options: { data: { name } } }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('회원가입 요청 시간 초과 — Supabase 연결을 확인해주세요.')), 10000)),
      ]);
      return { error };
    } catch (e: unknown) {
      return { error: e instanceof Error ? e : new Error('알 수 없는 오류') };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return { currentUser, loading, signIn, signUp, signOut, loadAppData };
}
