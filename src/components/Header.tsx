import { Cpu } from 'lucide-react';

const Header = () => {
  return (
    <header style={{ padding: '24px 48px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid var(--panel-border)', background: 'var(--panel-bg)' }}>
      <div style={{ background: 'var(--accent-brown)', padding: '8px', borderRadius: '8px', display: 'flex', boxShadow: '0 4px 10px rgba(139, 90, 43, 0.2)' }}>
        <Cpu color="white" size={28} />
      </div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
        .NET Migration <span style={{ color: 'var(--accent-brown)' }}>Platform</span>
      </h1>
    </header>
  );
};

export default Header;
