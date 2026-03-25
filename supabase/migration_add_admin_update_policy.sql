-- =============================================
-- Migration: admin이 다른 사용자의 역할/열람범위를 수정할 수 있도록 RLS 정책 추가
-- 실행 방법: Supabase Dashboard → SQL Editor에서 이 파일 내용을 붙여넣고 실행
-- =============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'users_update_admin' AND tablename = 'users'
  ) THEN
    CREATE POLICY "users_update_admin" ON public.users
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
      WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));
  END IF;
END $$;
