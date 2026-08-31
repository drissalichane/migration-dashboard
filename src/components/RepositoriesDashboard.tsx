import React, { useState, useEffect } from 'react';
import { FolderGit2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const RepositoriesDashboard: React.FC = () => {
  const [repos, setRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('http://localhost:5153/api/migrationjob/repositories', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(r => r.json())
    .then(data => {
      setRepos(data);
      setLoading(false);
    })
    .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading repositories...</div>;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'var(--panel-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FolderGit2 size={24} color="var(--accent-purple)" />
        </div>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '1.8rem', color: 'var(--text-primary)' }}>Migrated Repositories</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Repositories that have been processed by the .NET 8 Migration Pipeline.</p>
        </div>
      </div>

      {repos.length === 0 ? (
        <div className="glass-panel" style={{ padding: '64px', textAlign: 'center' }}>
          <FolderGit2 size={48} color="var(--panel-border)" style={{ marginBottom: '16px' }} />
          <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>No Repositories Found</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Start your first migration job to see repositories listed here.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {repos.map((repoUrl, i) => {
            const parts = repoUrl.replace('https://github.com/', '').replace('.git', '').split('/');
            const owner = parts[0];
            const name = parts[1];
            
            return (
              <div key={i} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <FolderGit2 size={24} color="var(--text-secondary)" />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{name}</h3>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{owner}</div>
                  </div>
                </div>
                
                <div style={{ marginTop: 'auto', paddingTop: '16px', borderTop: '1px solid var(--panel-border)' }}>
                  <button 
                    onClick={() => navigate('/history')}
                    style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: 0 }}
                  >
                    View Migration History <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RepositoriesDashboard;
