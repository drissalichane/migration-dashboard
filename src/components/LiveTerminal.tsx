import React, { useEffect, useRef } from 'react';
import { Terminal as TermIcon } from 'lucide-react';

interface Props {
  logs: string[];
}

const LiveTerminal: React.FC<Props> = ({ logs }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '400px', flex: 1, background: '#1e1e1e', borderColor: '#1e1e1e' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #333', display: 'flex', gap: '8px', alignItems: 'center', background: '#2d2d2d', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
        <TermIcon size={16} color="#a0a0a0" />
        <span style={{ fontSize: '0.85rem', color: '#a0a0a0', fontFamily: 'monospace' }}>MigrationExecutionAPI - stdout</span>
      </div>
      <div style={{ padding: '16px', overflowY: 'auto', flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', color: '#10b981', lineHeight: '1.5' }}>
        {logs.map((log, i) => (
          <div key={i} style={{ marginBottom: '4px' }}>
            <span style={{ color: '#666', marginRight: '8px' }}>&gt;</span> <span style={{ color: log.includes('Error') ? '#ef4444' : '#d4d4d4' }}>{log}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};

export default LiveTerminal;
