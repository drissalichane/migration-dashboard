import React, { useEffect, useState } from 'react';
import { Settings as SettingsIcon, GitBranch, Lock, User, CheckCircle, AlertTriangle } from 'lucide-react';

type GitHubStatus = {
  linked: boolean;
  source: 'github-login' | 'token' | null;
  login: string | null;
  savedToken: boolean;
  unreadable: boolean;
};

type Notice = { kind: 'ok' | 'error'; text: string } | null;

const authHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
});

// The backend answers errors as { message } or as a plain string; show whichever came back.
const errorText = async (res: Response, fallback: string) => {
  try {
    const text = await res.text();
    try { return JSON.parse(text)?.message || fallback; } catch { return text || fallback; }
  } catch { return fallback; }
};

const NoticeBox: React.FC<{ notice: Notice }> = ({ notice }) => notice && (
  <div style={{
    padding: '10px 12px', borderRadius: '8px', fontSize: '0.85rem',
    background: notice.kind === 'ok' ? '#dafbe1' : '#ffebe9',
    color: notice.kind === 'ok' ? '#1a7f37' : '#cf222e'
  }}>
    {notice.text}
  </div>
);

const Settings: React.FC = () => {
  const [githubToken, setGithubToken] = useState('');
  const [githubStatus, setGithubStatus] = useState<GitHubStatus | null>(null);
  const [githubBusy, setGithubBusy] = useState(false);
  const [githubNotice, setGithubNotice] = useState<Notice>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);

  const loadGithubStatus = async () => {
    try {
      const res = await fetch('http://localhost:5153/api/auth/github-token', { headers: authHeaders() });
      if (res.ok) setGithubStatus(await res.json());
    } catch { /* the panel stays in its "not linked" form */ }
  };

  useEffect(() => { loadGithubStatus(); }, []);

  const handleLinkGithub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!githubToken.trim()) return;
    setGithubBusy(true);
    setGithubNotice(null);
    try {
      const res = await fetch('http://localhost:5153/api/auth/github-token', {
        method: 'POST', headers: authHeaders(), body: JSON.stringify({ token: githubToken.trim() })
      });
      if (!res.ok) {
        setGithubNotice({ kind: 'error', text: await errorText(res, 'Could not save the token.') });
        return;
      }
      const data = await res.json();
      setGithubToken('');
      setGithubNotice({ kind: 'ok', text: `Token saved for GitHub account ${data.login}.` });
      await loadGithubStatus();
    } catch {
      setGithubNotice({ kind: 'error', text: 'Could not reach the server.' });
    } finally {
      setGithubBusy(false);
    }
  };

  const handleUnlinkGithub = async () => {
    setGithubBusy(true);
    setGithubNotice(null);
    try {
      const res = await fetch('http://localhost:5153/api/auth/github-token', { method: 'DELETE', headers: authHeaders() });
      if (!res.ok) {
        setGithubNotice({ kind: 'error', text: await errorText(res, 'Could not remove the token.') });
        return;
      }
      setGithubNotice({ kind: 'ok', text: 'Saved token removed.' });
      await loadGithubStatus();
    } catch {
      setGithubNotice({ kind: 'error', text: 'Could not reach the server.' });
    } finally {
      setGithubBusy(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordNotice(null);
    if (newPassword !== confirmPassword) {
      setPasswordNotice({ kind: 'error', text: "The new passwords don't match." });
      return;
    }
    setPasswordBusy(true);
    try {
      const res = await fetch('http://localhost:5153/api/auth/change-password', {
        method: 'POST', headers: authHeaders(),
        body: JSON.stringify({ currentPassword, newPassword })
      });
      if (!res.ok) {
        setPasswordNotice({ kind: 'error', text: await errorText(res, 'Could not update the password.') });
        return;
      }
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordNotice({ kind: 'ok', text: 'Password updated.' });
    } catch {
      setPasswordNotice({ kind: 'error', text: 'Could not reach the server.' });
    } finally {
      setPasswordBusy(false);
    }
  };

  const signedInWithGithub = githubStatus?.source === 'github-login';

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
        <p style={{ color: 'var(--text-secondary)', marginBottom: '16px', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Opening pull requests, browsing your repositories and following a PR's status all need access to
          GitHub. Signing in with GitHub gives it; an account made with a username and password can save a
          personal access token here instead.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '520px' }}>
          {githubStatus?.linked && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1a7f37', background: '#dafbe1', padding: '12px 16px', borderRadius: '8px' }}>
              <CheckCircle size={20} />
              <span>
                <strong>GitHub connected</strong>
                {githubStatus.login && <> as <strong>{githubStatus.login}</strong></>}
                {signedInWithGithub ? ' — through your GitHub sign-in.' : ' — with a saved personal access token.'}
              </span>
            </div>
          )}

          {githubStatus?.unreadable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#9a6700', background: '#fff8c5', padding: '12px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
              <AlertTriangle size={18} />
              Your saved token can no longer be read (the server's encryption keys changed). Save it again.
            </div>
          )}

          {githubStatus?.savedToken && (
            <button type="button" className="btn-secondary" onClick={handleUnlinkGithub} disabled={githubBusy} style={{ alignSelf: 'flex-start' }}>
              Remove saved token
            </button>
          )}

          {!signedInWithGithub && (
            <form onSubmit={handleLinkGithub} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input
                type="password"
                className="input-field"
                placeholder={githubStatus?.savedToken ? 'Replace with a new token' : 'Personal access token (classic or fine-grained)'}
                value={githubToken}
                onChange={e => setGithubToken(e.target.value)}
                autoComplete="off"
              />
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <a href="https://github.com/settings/tokens/new?scopes=repo&description=.NET%20Migration%20Platform" target="_blank" rel="noreferrer">
                  Create a classic token with the <code>repo</code> scope
                </a>
                {' '}(or a fine-grained one with read/write access to <em>Contents</em> and <em>Pull requests</em> on
                the repositories you migrate). It is checked with GitHub, then stored encrypted.
              </p>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button type="submit" className="btn-primary" disabled={!githubToken.trim() || githubBusy}>
                  {githubBusy ? 'Checking…' : githubStatus?.savedToken ? 'Replace Token' : 'Link via Token'}
                </button>
                <span style={{ color: 'var(--text-secondary)' }}>or</span>
                <button
                  type="button"
                  onClick={() => window.location.href = 'http://localhost:5153/api/auth/github'}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: '#24292e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500 }}
                >
                  <svg height="18" aria-hidden="true" viewBox="0 0 16 16" version="1.1" width="18" fill="currentColor">
                    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.46-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
                  </svg>
                  Sign in with GitHub instead
                </button>
              </div>
            </form>
          )}

          <NoticeBox notice={githubNotice} />
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--panel-border)', paddingBottom: '12px' }}>
          <Lock size={20} /> Change Password
        </h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '400px' }}>
          <input
            type="password"
            className="input-field"
            placeholder="Current password"
            value={currentPassword}
            onChange={e => setCurrentPassword(e.target.value)}
            autoComplete="current-password"
          />
          <p style={{ margin: '-4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Signed up with GitHub and never set a password? Leave this empty to set one.
          </p>
          <input
            type="password"
            className="input-field"
            placeholder="New password (8+ characters)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
          <input
            type="password"
            className="input-field"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <button type="submit" className="btn-primary" disabled={passwordBusy} style={{ alignSelf: 'flex-start' }}>
            {passwordBusy ? 'Updating…' : 'Update Password'}
          </button>
          <NoticeBox notice={passwordNotice} />
        </form>
      </div>

    </div>
  );
};

export default Settings;
