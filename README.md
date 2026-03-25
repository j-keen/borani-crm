# Mini CRM - 고객 관리 시스템

고객 정보, 상담 이력, 진행 상태를 통합 관리하는 경량 CRM 웹 애플리케이션입니다.

## 기술 스택

- **Frontend**: React 18 + TypeScript + TailwindCSS v4
- **Backend/DB**: Supabase (Auth + PostgreSQL + RLS)
- **상태관리**: Zustand
- **라우팅**: React Router v6
- **빌드**: Vite
- **배포**: Vercel

## 주요 기능

- 고객 DB 관리 (검색, 필터, 정렬, 동적 커스텀 필드)
- 상담 메모 & 상태 관리 (타임라인 UI, 이력 자동 기록)
- 역할 기반 권한 관리 (Admin / Staff / Viewer)
- 대시보드 (상태별 요약, 최근 활동, 담당자별 현황)
- 관리자 설정 (동적 필드, 상태값, 계정 관리)
- 모바일 반응형 UI

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. Supabase 프로젝트 설정

1. [Supabase](https://supabase.com)에서 새 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase/schema.sql` 파일의 내용을 실행합니다.
3. `.env.example`을 `.env.local`로 복사하고 Supabase 프로젝트 URL과 Anon Key를 입력합니다:

```bash
cp .env.example .env.local
```

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 개발 서버 실행

```bash
npm run dev
```

### 4. 첫 번째 관리자 계정 설정

1. 회원가입으로 첫 계정을 생성합니다.
2. Supabase Dashboard > Table Editor > users 테이블에서 해당 유저의 `role`을 `admin`으로 변경합니다.
3. 로그아웃 후 다시 로그인하면 관리자 메뉴가 활성화됩니다.

## Vercel 배포

```bash
npm install -g vercel
vercel
```

Vercel Dashboard에서 환경변수를 설정하세요:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 프로젝트 구조

```
src/
├── components/
│   ├── layout/          # AppLayout, Sidebar
│   ├── ui/              # StatusBadge, LoadingSpinner, EmptyState, ErrorState
│   ├── CustomerCard.tsx # 고객 카드 (모바일)
│   ├── MemoTimeline.tsx # 상담 이력 타임라인
│   └── PermissionGuard.tsx  # 권한 래퍼
├── hooks/
│   ├── useAuth.ts       # 인증 훅
│   └── usePermission.ts # 권한 체크 훅
├── lib/
│   └── supabase.ts      # Supabase 클라이언트
├── pages/
│   ├── DashboardPage.tsx
│   ├── CustomersPage.tsx
│   ├── CustomerDetailPage.tsx
│   ├── AdminSettingsPage.tsx
│   └── LoginPage.tsx
├── store/
│   └── appStore.ts      # Zustand 전역 상태
├── types/
│   └── index.ts         # TypeScript 타입 정의
├── App.tsx
├── main.tsx
└── index.css
```

## 권한 정책

| 기능 | Admin | Staff | Viewer |
|------|-------|-------|--------|
| 고객 조회 | 전체 | 범위 설정 | 전체 |
| 고객 추가/수정 | O | O | X |
| 고객 삭제 | O | X | X |
| 메모 작성 | O | O | X |
| 상태 변경 | O | O | X |
| 설정 관리 | O | X | X |
| 계정 관리 | O | X | X |

## DB 스키마

- `users`: 사용자 (Supabase Auth 연동)
- `customers`: 고객 (JSONB 동적 필드 포함)
- `memos`: 상담 메모
- `status_history`: 상태 변경 이력
- `status_options`: 동적 상태값
- `custom_fields`: 동적 커스텀 필드 정의
