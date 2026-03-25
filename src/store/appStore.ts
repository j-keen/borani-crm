import { create } from 'zustand';
import type { User, StatusOption, CustomField } from '../types';

interface AppState {
  // 현재 로그인 사용자
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // 전체 사용자 목록 (담당자 표시용)
  users: User[];
  setUsers: (users: User[]) => void;

  // 상태 옵션
  statusOptions: StatusOption[];
  setStatusOptions: (options: StatusOption[]) => void;

  // 커스텀 필드 정의
  customFields: CustomField[];
  setCustomFields: (fields: CustomField[]) => void;

  // 사이드바 상태
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),

  users: [],
  setUsers: (users) => set({ users }),

  statusOptions: [],
  setStatusOptions: (options) => set({ statusOptions: options }),

  customFields: [],
  setCustomFields: (fields) => set({ customFields: fields }),

  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));
