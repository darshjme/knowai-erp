import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Sidebar from './Sidebar';
import Header from './Header';
import HelpTour from '../ui/HelpTour';

export default function MainLayout() {
  const { sidebarCollapsed } = useSelector(s => s.ui);
  const { user } = useSelector(s => s.auth);

  return (
    <div className={`app-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="app-main">
        <Header />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
      <HelpTour role={user?.role} />
    </div>
  );
}
