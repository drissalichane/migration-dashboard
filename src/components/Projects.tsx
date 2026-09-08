import React, { useState, useEffect } from 'react';
import { FolderGit2, Plus, Users, Search, X } from 'lucide-react';

interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  cloneUrl: string;
  language: string;
  owner: string;
}

interface Project {
  id: number;
  name: string;
  repositoryUrl: string;
  organizationId: number;
  assignments: { userId: number; role: string; user?: { username: string } }[];
}

interface User {
  id: number;
  username: string;
}

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [githubRepos, setGithubRepos] = useState<GitHubRepository[]>([]);
  const [repos, setRepos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isRepoSearchModalOpen, setIsRepoSearchModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<number | null>(null);

  // Form states
  const [projectName, setProjectName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [repoSearchQuery, setRepoSearchQuery] = useState('');
  
  const [assignUserId, setAssignUserId] = useState('');
  const [assignRole, setAssignRole] = useState('Developer');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const username = localStorage.getItem('user_name') || '';
      const [pRes, uRes, rRes, ghRes] = await Promise.all([
        fetch(`http://localhost:5153/api/projects?username=${encodeURIComponent(username)}`),
        fetch('http://localhost:5153/api/users'),
        fetch('http://localhost:5153/api/migrationjob/repositories'),
        fetch('http://localhost:5153/api/github/repos', { headers: { 'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` } })
      ]);
      setProjects(await pRes.json());
      setUsers(await uRes.json());
      setRepos(await rRes.json());
      if (ghRes.ok) {
        const ghData = await ghRes.json();
        if (Array.isArray(ghData)) setGithubRepos(ghData);
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async () => {
    try {
      const username = localStorage.getItem('user_name') || '';
      await fetch(`http://localhost:5153/api/projects?username=${encodeURIComponent(username)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: projectName, repositoryUrl: repoUrl })
      });
      fetchData();
      setIsProjectModalOpen(false);
      setProjectName('');
      setRepoUrl('');
    } catch (e) {
      console.error(e);
    }
  };

  const assignUser = async () => {
    if (!activeProjectId || !assignUserId) return;
    try {
      await fetch(`http://localhost:5153/api/projects/${activeProjectId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: parseInt(assignUserId), role: assignRole })
      });
      fetchData();
      setIsAssignModalOpen(false);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <FolderGit2 size={28} color="var(--primary-color)" />
            Projects Dashboard
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            Import repositories and assign team members for migration tracking.
          </p>
        </div>
        {(localStorage.getItem('user_role') === 'Admin' || localStorage.getItem('user_role') === 'Manager') && (
          <button className="btn-primary" onClick={() => setIsProjectModalOpen(true)}>
            <Plus size={18} /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>Loading projects...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '20px' }}>
          {projects.map(p => (
            <div key={p.id} className="rule-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0 }}>{p.name}</h3>
                <span className="badge" style={{ background: '#e6f4ea', color: '#1a7f37' }}>Active</span>
              </div>
              <a href={p.repositoryUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-purple)', fontSize: '0.9rem', textDecoration: 'none' }}>
                {p.repositoryUrl}
              </a>
              
              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '8px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Assigned Members</span>
                  {(localStorage.getItem('user_role') === 'Admin' || localStorage.getItem('user_role') === 'Manager') && (
                    <button 
                      style={{ background: 'none', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => { setActiveProjectId(p.id); setIsAssignModalOpen(true); }}
                    >
                      <Plus size={14} /> Assign
                    </button>
                  )}
                </div>
                {p.assignments && p.assignments.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {p.assignments.map(a => (
                      <div key={a.userId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                        <span>{a.user?.username || `User ${a.userId}`}</span>
                        <span style={{ color: 'var(--text-secondary)' }}>{a.role}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>No members assigned.</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* NEW PROJECT MODAL */}
      {isProjectModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '450px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Import Project</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Project Name</label>
                <input className="input-field" placeholder="e.g. Migration Test" value={projectName} onChange={e => setProjectName(e.target.value)} style={{ marginTop: '4px' }} />
              </div>
              
              <div>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Repository</label>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '4px' }}>
                  <button 
                    type="button"
                    onClick={() => setIsRepoSearchModalOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px', background: 'white', border: '1px solid var(--panel-border)',
                      borderRadius: '8px', cursor: 'pointer', fontSize: '0.95rem', color: 'var(--text-primary)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <FolderGit2 size={18} color="var(--accent-purple)" />
                      <span style={{ fontWeight: 600, wordBreak: 'break-all', textAlign: 'left' }}>
                        {githubRepos.find(r => r.cloneUrl === repoUrl)?.fullName || 'Select a GitHub Repository...'}
                      </span>
                    </div>
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Browse</span>
                  </button>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>OR</span>
                    <div style={{ flex: 1, height: '1px', background: 'var(--panel-border)' }}></div>
                  </div>
                  
                  <input className="input-field" placeholder="Paste GitHub Repository URL" value={repoUrl} onChange={e => setRepoUrl(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button className="btn-secondary" onClick={() => setIsProjectModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={saveProject} disabled={!projectName || !repoUrl}>Import</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPO SEARCH MODAL */}
      {isRepoSearchModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
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
              <button onClick={() => setIsRepoSearchModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--panel-border)' }}>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: '14px', top: '12px', color: 'var(--text-secondary)' }} />
                <input 
                  type="text" 
                  placeholder="Search repositories..."
                  value={repoSearchQuery}
                  onChange={(e) => setRepoSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '12px 12px 12px 40px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: '#f8f9fa', fontSize: '1rem', outline: 'none' }}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {githubRepos.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>No repositories found or GitHub not linked.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px' }}>
                  {githubRepos.filter(r => r.fullName.toLowerCase().includes(repoSearchQuery.toLowerCase())).map(r => (
                    <button
                      key={r.id}
                      onClick={() => {
                        setRepoUrl(r.cloneUrl);
                        if (!projectName) setProjectName(r.name);
                        setIsRepoSearchModalOpen(false);
                        setRepoSearchQuery('');
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

      {/* ASSIGN USER MODAL */}
      {isAssignModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
          <div className="glass-panel" style={{ width: '400px', padding: '24px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>Assign User to Project</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Assigning a user will sync their access with GitHub (Collaborator).
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <select className="input-field" value={assignUserId} onChange={e => setAssignUserId(e.target.value)}>
                <option value="">-- Select User --</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
              </select>
              <select className="input-field" value={assignRole} onChange={e => setAssignRole(e.target.value)}>
                <option value="Developer">Developer</option>
                <option value="Manager">Manager</option>
              </select>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
                <button className="btn-secondary" onClick={() => setIsAssignModalOpen(false)}>Cancel</button>
                <button className="btn-primary" onClick={assignUser}>Assign</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Projects;
