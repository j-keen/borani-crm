import { NavLink } from 'react-router-dom';
import {
  HiOutlineHome,
  HiOutlineUsers,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
} from 'react-icons/hi2';
import { usePermission } from '../../hooks/usePermission';
import { useAppStore } from '../../store/appStore';

interface Props {
  onSignOut: () => void;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-indigo-50 text-indigo-700'
      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
  }`;

export function Sidebar({ onSignOut }: Props) {
  const { isAdmin, currentUser } = usePermission();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <>
      {/* 모바일 햄버거 */}
      <button
        onClick={toggleSidebar}
        className="fixed top-3 left-3 z-50 p-2 rounded-lg bg-white shadow-md lg:hidden"
      >
        <HiOutlineBars3 className="w-5 h-5" />
      </button>

      {/* 오버레이 (모바일) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-200 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* 로고 */}
        <div className="h-16 flex items-center px-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-indigo-600">Mini CRM</h1>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLink to="/" className={navLinkClass} end>
            <HiOutlineHome className="w-5 h-5" />
            대시보드
          </NavLink>
          <NavLink to="/customers" className={navLinkClass}>
            <HiOutlineUsers className="w-5 h-5" />
            고객 관리
          </NavLink>
          {isAdmin && (
            <NavLink to="/settings" className={navLinkClass}>
              <HiOutlineCog6Tooth className="w-5 h-5" />
              관리자 설정
            </NavLink>
          )}
        </nav>

        {/* 유저 정보 & 로그아웃 */}
        <div className="p-4 border-t border-gray-100">
          <div className="mb-3">
            <p className="text-sm font-medium text-gray-900">{currentUser?.name}</p>
            <p className="text-xs text-gray-500">{currentUser?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-50 text-indigo-700">
              {currentUser?.role === 'admin' ? '최고관리자' : currentUser?.role === 'staff' ? '일반직원' : '열람전용'}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <HiOutlineArrowRightOnRectangle className="w-5 h-5" />
            로그아웃
          </button>
        </div>
      </aside>
    </>
  );
}
