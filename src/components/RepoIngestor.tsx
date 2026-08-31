import React, { useState, useEffect } from 'react';
import { Code, ArrowRight, FolderGit2, Search, X, AlertTriangle } from 'lucide-react';

interface Props {
  onStart: (url: string, branch: string | null, commit: string | null, targetFramework: string, customBranchName: string, customPrompt: string) => void;
  isStarted: boolean;
}

interface Repository {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  language: string;
  owner: string;
}

interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  url: string;
}

const RepoIngestor: React.FC<Props> = ({ onStart, isStarted }) => {
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const filteredRepos = repos.filter(r => r.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
  
  const [branches, setBranches] = useState<{name: string, commitSha: string}[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  
  const [commits, setCommits] = useState<Commit[]>([]);
  const [selectedCommit, setSelectedCommit] = useState<string>('');
  
  const [targetFramework, setTargetFramework] = useState<string>('net8.0');
  const [customBranchName, setCustomBranchName] = useState<string>('');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [githubAuthError, setGithubAuthError] = useState(false);

  useEffect(() => {
    if (isStarted) return;
    setLoading(true);
    fetch('http://localhost:5153/api/github/repos', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        setRepos(data);
      }
      setLoading(false);
    })
    .catch((err) => {
      if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) {
        setGithubAuthError(true);
      }
      setLoading(false);
    });
  }, [isStarted]);

  useEffect(() => {
    if (!selectedRepo) {
      setBranches([]);
      setSelectedBranch('');
      return;
    }
    const repo = repos.find(r => r.cloneUrl === selectedRepo);
    if (!repo) return;

    fetch(`http://localhost:5153/api/github/repos/${repo.owner}/${repo.name}/branches`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      if (Array.isArray(data)) setBranches(data);
    })
    .catch((err) => {
      if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) {
        setGithubAuthError(true);
      }
    });
  }, [selectedRepo, repos]);

  useEffect(() => {
    if (!selectedRepo) {
      setCommits([]);
      setSelectedCommit('');
      return;
    }
    const repo = repos.find(r => r.cloneUrl === selectedRepo);
    if (!repo) return;

    setLoadingCommits(true);
    const branchQuery = selectedBranch ? `?branch=${selectedBranch}` : '';
    fetch(`http://localhost:5153/api/github/repos/${repo.owner}/${repo.name}/commits${branchQuery}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` }
    })
    .then(async r => {
      if (!r.ok) {
        const txt = await r.text();
        throw new Error(txt);
      }
      return r.json();
    })
    .then(data => {
      if (Array.isArray(data)) setCommits(data);
      setLoadingCommits(false);
    })
    .catch((err) => {
      if (err.message?.includes('Bad credentials') || err.message?.includes('Unauthorized')) {
        setGithubAuthError(true);
      }
      setLoadingCommits(false);
    });
  }, [selectedRepo, selectedBranch, repos]);

  if (isStarted) return null;
  
  const selectedRepoObj = repos.find(r => r.cloneUrl === selectedRepo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: '2.5rem', fontWeight: 700, marginBottom: '16px', color: 'var(--text-primary)' }}>
        Automate your <span style={{ color: 'var(--accent-purple)' }}>.NET 8</span> Upgrades
      </h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '40px', maxWidth: '600px' }}>
        Select a GitHub repository below. Our pipeline will clone, analyze, and generate a migration PR for your review.
      </p>

      <div className="glass-panel" style={{ padding: '24px', width: '100%', maxWidth: '600px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px', background: 'white', border: '1px solid var(--panel-border)',
            borderRadius: '8px', cursor: 'pointer', fontSize: '1rem', color: 'var(--text-primary)',
            boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FolderGit2 size={24} color="var(--accent-purple)" />
            <span style={{ fontWeight: 600 }}>
              {selectedRepoObj ? selectedRepoObj.fullName : 'Select a GitHub Repository...'}
            </span>
          </div>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Browse</span>
        </button>

        {loadingCommits && <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading recent commits...</div>}
        
        {branches.length > 0 && (
          <select 
            className="input-glow"
            value={selectedBranch} 
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white' }}
          >
            <option value="">-- Default Branch --</option>
            {branches.map(b => (
              <option key={b.name} value={b.name}>{b.name}</option>
            ))}
          </select>
        )}

        {commits.length > 0 && (
          <select 
            className="input-glow"
            value={selectedCommit} 
            onChange={(e) => setSelectedCommit(e.target.value)}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white' }}
          >
            <option value="">-- Latest Commit --</option>
            {commits.map(c => (
              <option key={c.sha} value={c.sha}>{c.sha.substring(0, 7)} - {c.message.substring(0, 50)}</option>
            ))}
          </select>
        )}

        {selectedRepo && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px', textAlign: 'left' }}>
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Target .NET Framework</label>
              <select 
                className="input-glow"
                value={targetFramework} 
                onChange={(e) => setTargetFramework(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', marginTop: '4px' }}
              >
                <option value="net8.0">.NET 8.0 (LTS)</option>
                <option value="net9.0">.NET 9.0</option>
              </select>
            </div>
            
            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Custom Branch Name (Optional)</label>
              <input 
                type="text" 
                className="input-glow"
                placeholder="e.g. feature/upgrade-to-net8"
                value={customBranchName}
                onChange={(e) => setCustomBranchName(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', marginTop: '4px' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Additional AI Instructions (Optional)</label>
              <textarea 
                className="input-glow"
                placeholder="e.g. Do not upgrade AutoMapper. Use Serilog instead of NLog."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', marginTop: '4px', resize: 'vertical' }}
              />
            </div>
          </div>
        )}

        <button 
          className="btn-primary" 
          onClick={() => onStart(selectedRepo, selectedBranch || null, selectedCommit || null, targetFramework, customBranchName, customPrompt)} 
          disabled={!selectedRepo} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', opacity: selectedRepo ? 1 : 0.5, marginTop: '8px' }}
        >
          Create Migration PR <ArrowRight size={18} />
        </button>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '800px',
            maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <FolderGit2 size={20} /> Select Repository
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search repositories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#f8f9fa', fontSize: '1rem', outline: 'none' }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading repositories...</div>
              ) : filteredRepos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No repositories found.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {filteredRepos.map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedRepo(r.cloneUrl);
                        setIsModalOpen(false);
                        setSearchQuery('');
                      }}
                      style={{
                        background: 'white', border: '1px solid var(--panel-border)', borderRadius: '8px',
                        padding: '16px', textAlign: 'left', cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-purple)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(124, 58, 237, 0.1)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.borderColor = 'var(--panel-border)';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>{r.name}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{r.owner}</div>
                      <div style={{ display: 'inline-block', padding: '2px 8px', background: '#f1f8ff', color: '#0366d6', borderRadius: '12px', fontSize: '0.75rem', marginTop: '4px', alignSelf: 'flex-start' }}>
                        {r.language || 'Unknown'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {githubAuthError && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          padding: '24px'
        }}>
          <div style={{
            background: 'white', borderRadius: '12px', width: '100%', maxWidth: '400px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--panel-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px', color: '#cf222e' }}>
                <AlertTriangle size={20} /> GitHub Session Expired
              </h3>
              <button onClick={() => setGithubAuthError(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ margin: '0 0 24px 0', color: 'var(--text-primary)' }}>Your GitHub access token has expired or is invalid. Please reconnect your account to view files and commits.</p>
              
              <button 
                onClick={() => { localStorage.clear(); window.location.href = 'http://localhost:5153/api/auth/github'; }}
                style={{ 
                  width: '100%', padding: '12px', background: '#cf222e', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer'
                }}
              >
                Reconnect GitHub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RepoIngestor;
