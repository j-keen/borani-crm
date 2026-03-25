-- =============================================
-- 마이그레이션 V2: 통신/인터넷 판매용 계층형 옵션 모델 적용
-- 기존 상태(Status) 관리와 상품(Product/Option) 관리를 명확히 분리합니다.
-- =============================================

-- 1. 옵션 카테고리 리스트 (확장성을 위한 기준 테이블)
CREATE TABLE IF NOT EXISTS public.option_categories (
  code TEXT PRIMARY KEY, -- 'provider', 'plan', 'tv', 'speed', 'addon' 등
  name TEXT NOT NULL,    -- '통신사', '유심요금제', 'TV옵션', '인터넷속도', '기타옵션'
  description TEXT,
  sort_order INT DEFAULT 0
);

-- 기본 카테고리 데이터 세팅
INSERT INTO public.option_categories (code, name, sort_order) VALUES
  ('provider', '통신사', 1),
  ('plan', '유심요금제', 2),
  ('tv', 'TV옵션', 3),
  ('speed', '인터넷속도', 4),
  ('addon', '부가옵션(유/무)', 5)
ON CONFLICT (code) DO NOTHING;

-- 2. 실제 옵션 항목들을 담는 테이블 (트리/종속성 구조 지원)
CREATE TABLE IF NOT EXISTS public.option_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_code TEXT NOT NULL REFERENCES public.option_categories(code) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.option_items(id) ON DELETE CASCADE, -- 핵심: SK(부모) -> 5G프라임(자식) 연결고리
  label TEXT NOT NULL, -- 'SK', '5G 베이직', '100M', '와이파이 포함' 등
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_option_items_category ON public.option_items(category_code);
CREATE INDEX IF NOT EXISTS idx_option_items_parent ON public.option_items(parent_id);

-- 3. 고객 테이블 (customers) 업데이트
-- 이전 시도했던 임시 컬럼(option_id)이 있다면 제거하고, 명시적인 통신 상품 컬럼으로 재구성
ALTER TABLE public.customers DROP COLUMN IF EXISTS option_id;

ALTER TABLE public.customers 
  ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES public.option_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.option_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS tv_id UUID REFERENCES public.option_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS speed_id UUID REFERENCES public.option_items(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS addons_json JSONB DEFAULT '[]'::jsonb; -- 유/무 옵션 등 다중선택 사항 보관용

-- 4. RLS (Row Level Security) 보안 정책
ALTER TABLE public.option_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.option_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_all" ON public.option_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_all_admin" ON public.option_categories FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "items_select_all" ON public.option_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "items_all_admin" ON public.option_items FOR ALL TO authenticated USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- =============================================
-- 마이그레이션 V3: 동적 데이터 그리드 사용자 설정 저장 테이블
-- =============================================
CREATE TABLE IF NOT EXISTS public.user_table_settings (
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

-- updated_at 트리거
DROP TRIGGER IF EXISTS user_table_settings_updated_at ON public.user_table_settings;
CREATE TRIGGER user_table_settings_updated_at
  BEFORE UPDATE ON public.user_table_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
