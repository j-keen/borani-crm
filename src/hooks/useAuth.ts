import { useEffect, useState, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

const AUTH_TIMEOUT_MS = 15000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 시간 초과 (${ms / 1000}초)`)), ms)
    ),
  ]);
}

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

  // 글로벌 안전 타임아웃: 어떤 이유로든 12초 내 로딩이 끝나지 않으면 강제 해제
  useEffect(() => {
    const safety = setTimeout(() => {
      setLoading((prev) => {
        if (prev) console.error('Auth 안전 타임아웃 도달 (20초) — 로그인 화면으로 이동');
        return false;
      });
    }, 20000);
    return () => clearTimeout(safety);
  }, []);

  useEffect(() => {
    // 환경변수 미설정 시 즉시 로그인 화면 표시
    if (!isSupabaseConfigured) {
      console.error('Supabase 환경변수 미설정 — 로그인 화면으로 이동');
      setLoading(false);
      return;
    }

    let aborted = false;

    const init = async () => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          AUTH_TIMEOUT_MS,
          'Supabase 세션 조회'
        );
        if (aborted) return;
        if (session?.user) {
          const profile = await withTimeout(
            getOrCreateProfile(session.user),
            AUTH_TIMEOUT_MS,
            '프로필 조회'
          );
          if (aborted) return;
          if (profile) {
            setCurrentUser(profile);
            if (!aborted) setLoading(false);
            // 앱 데이터는 백그라운드 로드 → 화면 즉시 표시
            loadAppData().catch(e => console.error('앱 데이터 로딩 실패:', e));
            return;
          }
        }
      } catch (e) {
        console.error('Auth 초기화 실패:', e);
        // 세션 타임아웃 시 stale 세션 정리 → 다음 로드에서 깨끗한 시작
        try { await supabase.auth.signOut({ scope: 'local' }); } catch {}
      } finally {
        if (!aborted) setLoading(false);
      }
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (aborted) return;
      try {
        if (session?.user) {
          const profile = await getOrCreateProfile(session.user);
          if (!aborted && profile) {
            setCurrentUser(profile);
            await loadAppData();
          }
        } else {
          if (!aborted) setCurrentUser(null);
        }
      } catch (e) {
        console.error('Auth 상태 변경 처리 실패:', e);
      }
    });

    return () => {
      aborted = true;
      subscription.unsubscribe();
    };
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
