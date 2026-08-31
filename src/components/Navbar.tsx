import React from 'react';
import { LogOut, User } from 'lucide-react';

interface NavbarProps {
  userName?: string;
  avatarUrl?: string;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ userName, avatarUrl, onLogout }) => {
  return (
    <div style={{
      height: '80px',
      background: 'white',
      borderBottom: '1px solid var(--panel-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      padding: '0 48px',
      position: 'sticky',
      top: 0,
      zIndex: 10
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <User size={20} color="#888" />
            </div>
          )}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            {userName || 'Unknown User'}
          </span>
        </div>
        
        <div style={{ width: '1px', height: '24px', background: 'var(--panel-border)' }}></div>

        <button 
          onClick={onLogout} 
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--text-secondary)', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px', 
            fontSize: '0.9rem', 
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '8px',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
          onMouseOut={(e) => e.currentTarget.style.background = 'none'}
        >
          <LogOut size={16} /> Logout
        </button>
      </div>
    </div>
  );
};

export default Navbar;
