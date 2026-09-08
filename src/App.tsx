import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import RepoIngestor from './components/RepoIngestor';
import Login from './components/Login';
import HistoryDashboard from './components/HistoryDashboard';
import JobDetail from './components/JobDetail';
import MigrationStatsDashboard from './components/MigrationStatsDashboard';
import KnowledgeBase from './components/KnowledgeBase';
import Governance from './components/Governance';
import Projects from './components/Projects';
import Settings from './components/Settings';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('jwt_token');
    const name = localStorage.getItem('user_name');
    const avatar = localStorage.getItem('avatar_url');
    
    if (token) {
      setIsAuthenticated(true);
      setUserName(name || '');
      setAvatarUrl(avatar || '');
    }
  }, []);

  const handleLogin = (token: string, role: string) => {
    // using token and role could be done here if needed
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_role', role);
    setIsAuthenticated(true);
    setUserName(localStorage.getItem('user_name') || '');
    setAvatarUrl(localStorage.getItem('avatar_url') || '');
  };

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = () => {
    setIsLogoutModalOpen(false);
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('avatar_url');
    setIsAuthenticated(false);
    setUserName('');
    setAvatarUrl('');
    navigate('/');
  };


  const startMigration = async (repoUrl: string, branch: string | null, commit: string | null, targetFramework: string, customBranchName: string, customPrompt: string) => {
    try {
      const payload: any = { repositoryUrl: repoUrl };
      if (branch) payload.targetBranch = branch;
      if (commit) payload.targetCommit = commit;
      if (targetFramework) payload.targetFramework = targetFramework;
      if (customBranchName) payload.customBranchName = customBranchName;
      if (customPrompt) payload.customPrompt = customPrompt;

      const res = await fetch('http://localhost:5153/api/migrationjob/analyze', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` 
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.details || data.message || 'Failed to start migration');
      }

      navigate(`/jobs/${data.jobId}`);
    } catch (err: any) {
      alert(`Failed to connect to backend: ${err.message}`);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  const DashboardView = () => (
    <>
      <RepoIngestor isStarted={false} onStart={startMigration} />
    </>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <Sidebar />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Navbar userName={userName} avatarUrl={avatarUrl} onLogout={handleLogoutClick} />
        
        <main style={{ padding: '32px 48px', overflowY: 'auto', flex: 1, position: 'relative' }}>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/login" element={<DashboardView />} />
            <Route path="/history" element={<HistoryDashboard />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/stats" element={<MigrationStatsDashboard />} />
            <Route path="/rules" element={<KnowledgeBase />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/governance" element={<Governance />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>

          {/* LOGOUT CONFIRMATION MODAL */}
          {isLogoutModalOpen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(8px)' }}>
              <div className="glass-panel" style={{ width: '400px', padding: '24px', textAlign: 'center' }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.25rem' }}>Confirm Logout</h3>
                <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)' }}>Are you sure you want to log out of your session?</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                  <button className="btn-secondary" onClick={() => setIsLogoutModalOpen(false)}>Cancel</button>
                  <button className="btn-primary" onClick={confirmLogout} style={{ background: '#cf222e' }}>Logout</button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
