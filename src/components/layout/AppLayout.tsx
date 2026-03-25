import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAppStore } from '../../store/appStore';

interface Props {
  onSignOut: () => void;
}

export function AppLayout({ onSignOut }: Props) {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen);

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar onSignOut={onSignOut} />
      <main
        className={`flex-1 overflow-y-auto transition-all duration-200 ${
          sidebarOpen ? 'lg:ml-0' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-16 lg:pt-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
