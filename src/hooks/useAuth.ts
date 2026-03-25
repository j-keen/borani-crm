import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAppStore } from '../store/appStore';
import type { User } from '../types';

export function useAuth() {
  const { currentUser, setCurrentUser, setUsers, setStatusOptions, setCustomFields } = useAppStore();
  const [loading, setLoading] = useState(true);

  // 앱 초기 데이터 로드 (상태옵션, 커스텀필드, 사용자 목록)
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

  // 세션 체크 및 유저 프로필 로드
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setCurrentUser(data as User);
          await loadAppData();
        }
      }
      setLoading(false);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();
        if (data) {
          setCurrentUser(data as User);
          await loadAppData();
        }
      } else {
        setCurrentUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [setCurrentUser, loadAppData]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
  };

  return { currentUser, loading, signIn, signUp, signOut, loadAppData };
}
