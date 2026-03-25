-- =============================================
-- Mini CRM - Supabase DB 스키마
-- =============================================

-- 0. 확장 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 1. 사용자 테이블 (Supabase Auth와 연동)
-- =============================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'viewer')),
  view_scope TEXT NOT NULL DEFAULT 'own' CHECK (view_scope IN ('all', 'own')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 상태 옵션 테이블 (동적 상태값 관리)
CREATE TABLE public.status_options (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기본 상태값 삽입
INSERT INTO public.status_options (label, color, sort_order) VALUES
  ('신청', '#3B82F6', 0),
  ('상담중', '#F59E0B', 1),
  ('완료', '#10B981', 2),
  ('보류', '#6B7280', 3),
  ('재상담', '#8B5CF6', 4),
  ('설치완료', '#06B6D4', 5);

-- 3. 커스텀 필드 정의 테이블 (동적 필드 관리)
CREATE TABLE public.custom_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  field_key TEXT NOT NULL UNIQUE,
  field_label TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text' CHECK (field_type IN ('text', 'number', 'date', 'select', 'textarea')),
  sort_order INT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  options JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. 고객 테이블
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL,
  extra_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. 상담 메모 테이블
CREATE TABLE public.memos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. 상태 변경 이력 테이블
CREATE TABLE public.status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  from_status_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL,
  to_status_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL,
  changed_by UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- 인덱스
-- =============================================
CREATE INDEX idx_customers_assigned_to ON public.customers(assigned_to);
CREATE INDEX idx_customers_status_id ON public.customers(status_id);
CREATE INDEX idx_customers_created_at ON public.customers(created_at DESC);
CREATE INDEX idx_memos_customer_id ON public.memos(customer_id);
CREATE INDEX idx_memos_created_at ON public.memos(created_at DESC);
CREATE INDEX idx_status_history_customer_id ON public.status_history(customer_id);

-- =============================================
-- RLS (Row Level Security) 정책
-- =============================================

-- users 테이블 RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_all" ON public.users
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- admin은 모든 사용자 정보 수정 가능
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_insert_admin" ON public.users
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_delete_admin" ON public.users
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- customers 테이블 RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- 모든 인증 사용자는 조건부 조회 가능 (view_scope에 따라)
CREATE POLICY "customers_select" ON public.customers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND (
        u.role = 'admin'
        OR u.view_scope = 'all'
        OR (u.view_scope = 'own' AND customers.assigned_to = auth.uid())
      )
    )
  );

-- Staff 이상만 고객 추가 가능
CREATE POLICY "customers_insert" ON public.customers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'staff')
    )
  );

-- Staff 이상만 고객 수정 가능
CREATE POLICY "customers_update" ON public.customers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'staff')
    )
  );

-- Admin만 고객 삭제 가능
CREATE POLICY "customers_delete" ON public.customers
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- memos 테이블 RLS
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "memos_select" ON public.memos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.customers c
      JOIN public.users u ON u.id = auth.uid()
      WHERE c.id = memos.customer_id
      AND (
        u.role = 'admin'
        OR u.view_scope = 'all'
        OR (u.view_scope = 'own' AND c.assigned_to = auth.uid())
      )
    )
  );

CREATE POLICY "memos_insert" ON public.memos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- status_history 테이블 RLS
ALTER TABLE public.status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_history_select" ON public.status_history
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "status_history_insert" ON public.status_history
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'staff')
    )
  );

-- status_options 테이블 RLS
ALTER TABLE public.status_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "status_options_select" ON public.status_options
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "status_options_manage_admin" ON public.status_options
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- custom_fields 테이블 RLS
ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "custom_fields_select" ON public.custom_fields
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "custom_fields_manage_admin" ON public.custom_fields
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- =============================================
-- 트리거: updated_at 자동 갱신
-- =============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =============================================
-- 트리거: 신규 Auth 유저 생성 시 users 테이블에 자동 삽입
-- =============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role, view_scope)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    'own'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =============================================
-- 7. 사용자 테이블 설정 보관 테이블
-- =============================================
CREATE TABLE public.user_table_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  page_key TEXT NOT NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, page_key)
);

ALTER TABLE public.user_table_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_settings_select" ON public.user_table_settings
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "user_settings_insert" ON public.user_table_settings
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_settings_update" ON public.user_table_settings
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER user_table_settings_updated_at
  BEFORE UPDATE ON public.user_table_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
