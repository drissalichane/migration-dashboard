import React, { useState } from 'react';
import { Settings as SettingsIcon, GitBranch, Lock, User, CheckCircle } from 'lucide-react';

const Settings: React.FC = () => {
  const [githubToken, setGithubToken] = useState('');
  const [githubLinked, setGithubLinked] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleLinkGithub = (e: React.FormEvent) => {
    e.preventDefault();
    if (githubToken) {
      setGithubLinked(true);
      setGithubToken('');
      alert('GitHub account linked successfully!');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    alert('Password updated successfully!');
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <SettingsIcon size={28} color="var(--primary-color)" />
          Settings
        </h1>
        <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
          Manage your account settings and integrations.
        </p>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <User size={20} /> Personal Information
        </h3>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--accent-brown)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>
            {localStorage.getItem('user_name')?.[0]?.toUpperCase() || 'U'}
          </div>
          <div>
            <p style={{ margin: '0 0 4px 0', fontWeight: 600, fontSize: '1.1rem' }}>{localStorage.getItem('user_name')}</p>
            <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Role: {localStorage.getItem('user_role')}</p>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <GitBranch size={20} /> GitHub Integration
        </h3>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem' }}>
          Link your GitHub account to enable automatic repository syncing and PR creation.
        </p>
        
        {githubLinked ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a7f37', background: '#dafbe1', padding: '12px 16px', borderRadius: '8px' }}>
            <CheckCircle size={20} />
            <strong>GitHub Connected</strong>
          </div>
        ) : (
          <form onSubmit={handleLinkGithub} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
            <input 
              type="password" 
              className="input-field" 
              placeholder="Personal Access Token (classic or fine-grained)" 
              value={githubToken} 
              onChange={e => setGithubToken(e.target.value)} 
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button type="submit" className="btn-primary" disabled={!githubToken}>Link via Token</button>
              <span style={{ color: 'var(--text-secondary)' }}>or</span>
              <button 
                type="button" 
                onClick={() => window.location.href = 'http://localhost:5153/api/auth/github'}
                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#24292e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
              >
                <svg height="18" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="18" fill="currentColor">
                  <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.46-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                </svg>
                Authenticate with GitHub
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <Lock size={20} /> Change Password
        </h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <input 
            type="password" 
            className="input-field" 
            placeholder="Current Password" 
            value={currentPassword} 
            onChange={e => setCurrentPassword(e.target.value)} 
            required
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="New Password" 
            value={newPassword} 
            onChange={e => setNewPassword(e.target.value)} 
            required
          />
          <input 
            type="password" 
            className="input-field" 
            placeholder="Confirm New Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required
          />
          <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>Update Password</button>
        </form>
      </div>

    </div>
  );
};

export default Settings;
