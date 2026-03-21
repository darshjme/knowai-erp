import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import RightPanel from './RightPanel';
import CommandPalette from './CommandPalette';
import HelpTour from '../ui/HelpTour';
import ProfileSetupAlert from '../ui/ProfileSetupAlert';
import type { RootState } from '../../store/store';

export default function MainLayout() {
  const { sidebarCollapsed, rightPanelCollapsed } = useSelector((s: RootState) => s.ui);
  const { user } = useSelector((s: RootState) => s.auth);

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-primary)]">
      {/* Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6 lg:p-6 md:p-4 sm:p-3">
          <div className="max-w-[1800px] mx-auto 3xl:mx-auto">
            <ProfileSetupAlert />
            <Outlet />
          </div>
        </main>
      </div>

      {/* Right Panel */}
      <RightPanel />

      {/* Global Overlays */}
      <CommandPalette />
      <HelpTour role={user?.role} />
    </div>
  );
}
