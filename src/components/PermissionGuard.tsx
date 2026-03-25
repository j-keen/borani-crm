import type { ReactNode } from 'react';
import { usePermission } from '../hooks/usePermission';

interface Props {
  action: 'create' | 'edit' | 'delete' | 'manage_settings' | 'write_memo' | 'change_status';
  children: ReactNode;
  fallback?: ReactNode;
}

// 권한 래퍼 컴포넌트 - role에 따라 렌더링 제어
export function PermissionGuard({ action, children, fallback = null }: Props) {
  const { can } = usePermission();
  return can(action) ? <>{children}</> : <>{fallback}</>;
}
