import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import RepoIngestor from './components/RepoIngestor';
import Login from './components/Login';
import HistoryDashboard from './components/HistoryDashboard';
import JobDetail from './components/JobDetail';
import RepositoriesDashboard from './components/RepositoriesDashboard';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
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

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_name');
    localStorage.removeItem('avatar_url');
    setIsAuthenticated(false);
    setUserName('');
    setAvatarUrl('');
    navigate('/');
  };


  const startMigration = async (url: string, branch: string | null = null, commit: string | null = null) => {
    try {
      const res = await fetch('http://localhost:5153/api/migrationjob/analyze', {
        method: 'POST',
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('jwt_token')}` 
        },
        body: JSON.stringify({ 
            repositoryUrl: url,
            targetBranch: branch,
            targetCommit: commit
        })
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
        <Navbar userName={userName} avatarUrl={avatarUrl} onLogout={handleLogout} />
        
        <main style={{ padding: '32px 48px', overflowY: 'auto', flex: 1 }}>
          <Routes>
            <Route path="/" element={<DashboardView />} />
            <Route path="/login" element={<DashboardView />} />
            <Route path="/history" element={<HistoryDashboard />} />
            <Route path="/jobs/:id" element={<JobDetail />} />
            <Route path="/repositories" element={<RepositoriesDashboard />} />
            <Route path="/settings" element={
              <div className="glass-panel" style={{ padding: '48px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <h3>Settings</h3>
                <p>Configure pipeline settings and credentials.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
