import { useCallback } from 'react';
import { useAppStore } from '../store/appStore';
import type { Role } from '../types';

// 권한 체크 훅
export function usePermission() {
  const currentUser = useAppStore((s) => s.currentUser);
  const role: Role = currentUser?.role ?? 'viewer';

  const isAdmin = role === 'admin';
  const isStaff = role === 'staff';
  const isViewer = role === 'viewer';

  // 특정 권한 여부 체크
  const can = useCallback(
    (action: 'create' | 'edit' | 'delete' | 'manage_settings' | 'write_memo' | 'change_status') => {
      switch (action) {
        case 'create':
        case 'edit':
        case 'write_memo':
        case 'change_status':
          return role === 'admin' || role === 'staff';
        case 'delete':
        case 'manage_settings':
          return role === 'admin';
        default:
          return false;
      }
    },
    [role]
  );

  return { role, isAdmin, isStaff, isViewer, can, currentUser };
}
