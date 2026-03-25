-- =============================================
-- 마이그레이션: 상태 및 옵션 관리에 Depth/종속성 추가
-- =============================================

-- 1. status_options 테이블에 상위-하위 관계설정 컬럼 추가
ALTER TABLE public.status_options 
ADD COLUMN parent_id UUID REFERENCES public.status_options(id) ON DELETE CASCADE;

-- 인덱스 추가 (부모 ID 검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_status_options_parent_id ON public.status_options(parent_id);

-- 2. customers 테이블에 옵션 선택 컬럼 추가
ALTER TABLE public.customers 
ADD COLUMN option_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_customers_option_id ON public.customers(option_id);

-- 3. RLS 업데이트 (필요시)
-- 관리자가 status_options의 모든 데이터를 관리할 권한은 이미 `status_options_manage_admin` 정책으로 처리되어 있으므로
-- 별도의 변경이 필요하지 않습니다.

-- 4. status_history 테이블 업데이트 (부가적 옵션 변경 이력 추적용 - 선택사항)
ALTER TABLE public.status_history 
ADD COLUMN from_option_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL,
ADD COLUMN to_option_id UUID REFERENCES public.status_options(id) ON DELETE SET NULL;
