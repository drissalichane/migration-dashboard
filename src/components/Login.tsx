import React, { useState } from 'react';
import { LogIn, UserPlus, Shield, User } from 'lucide-react';

interface Props {
  onLogin: (token: string, role: string) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Dev');
  const [error, setError] = useState('');

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const userRole = params.get('role');
    const userName = params.get('name');
    const avatar = params.get('avatar');
    const userId = params.get('userId');
    const teamId = params.get('teamId');
    
    if (token && userRole) {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('user_role', userRole);
      if (userName) localStorage.setItem('user_name', userName);
      if (avatar) localStorage.setItem('avatar_url', avatar);
      if (userId && userId !== 'null' && userId !== 'undefined') localStorage.setItem('user_id', userId);
      if (teamId && teamId !== 'null' && teamId !== 'undefined') localStorage.setItem('team_id', teamId);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      onLogin(token, userRole);
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const url = isRegistering 
      ? 'http://localhost:5153/api/auth/register' 
      : 'http://localhost:5153/api/auth/login';

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(isRegistering ? { username, password, role } : { username, password })
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        data = { message: await response.text() };
      }

      if (!response.ok) {
        throw new Error(data.message || data.title || 'Authentication failed');
      }

      if (isRegistering) {
        // Automatically switch back to login after successful register
        setIsRegistering(false);
        setPassword('');
        setError('Registration successful! Please log in.');
      } else {
        localStorage.setItem('jwt_token', data.token);
        localStorage.setItem('user_role', data.role);
        if (data.userId) localStorage.setItem('user_id', data.userId.toString());
        if (data.teamId) localStorage.setItem('team_id', data.teamId.toString());
        onLogin(data.token, data.role);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: 'var(--bg-color)' }}>
      <div className="glass-panel" style={{ width: '400px', padding: '40px' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
          <div style={{ width: '48px', height: '48px', background: '#eceae4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
            <Shield size={24} color="var(--accent-brown)" />
          </div>
          <h2 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
            {isRegistering ? 'Create Account' : 'Welcome Back'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Enterprise Migration Platform
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {error && (
            <div style={{ padding: '12px', borderRadius: '6px', background: error.includes('successful') ? '#e6f4ea' : '#ffebe9', color: error.includes('successful') ? '#0d652d' : '#cf222e', fontSize: '0.9rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Username</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', color: 'var(--text-primary)', outline: 'none' }}
            />
          </div>

          {isRegistering && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--panel-border)', background: 'white', color: 'var(--text-primary)', outline: 'none', cursor: 'pointer' }}
              >
                <option value="Dev">Developer (Read-Only)</option>
                <option value="Manager">Manager (Approver)</option>
                <option value="Admin">Admin (Full Access)</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', padding: '12px', marginTop: '8px' }}>
            {isRegistering ? <UserPlus size={18} /> : <LogIn size={18} />}
            {isRegistering ? 'Sign Up' : 'Sign In'}
          </button>

          {!isRegistering && (
            <button 
              type="button" 
              onClick={() => window.location.href = 'http://localhost:5153/api/auth/github'}
              style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', padding: '12px', background: '#24292e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, marginTop: '8px' }}
            >
              <svg height="18" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="18" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.46-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
              </svg>
              Login with GitHub
            </button>
          )}
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => { setIsRegistering(!isRegistering); setError(''); }}
            style={{ background: 'none', border: 'none', color: 'var(--accent-brown)', fontWeight: 500, cursor: 'pointer', fontSize: '0.9rem' }}
          >
            {isRegistering ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
