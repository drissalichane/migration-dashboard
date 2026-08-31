import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, History, Settings, GitPullRequest } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/history', label: 'Migration History', icon: <History size={18} /> },
    { path: '/repositories', label: 'Repositories', icon: <GitPullRequest size={18} /> },
    { path: '/settings', label: 'Settings', icon: <Settings size={18} /> }
  ];

  const isActive = (itemPath: string) => {
    if (itemPath === '/') return location.pathname === '/';
    return location.pathname.startsWith(itemPath);
  };

  return (
    <div style={{
      width: '260px',
      background: 'white',
      borderRight: '1px solid var(--panel-border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'sticky',
      top: 0
    }}>
      <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--panel-border)' }}>
        <div style={{ width: '32px', height: '32px', background: 'var(--accent-brown)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: 'white', fontWeight: 'bold' }}>N</span>
        </div>
        <h2 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>.NET Migration</h2>
      </div>

      <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {menuItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 16px',
              background: isActive(item.path) ? '#f3f0eb' : 'transparent',
              color: isActive(item.path) ? 'var(--accent-brown)' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: isActive(item.path) ? 600 : 500,
              textAlign: 'left',
              transition: 'all 0.2s'
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;
