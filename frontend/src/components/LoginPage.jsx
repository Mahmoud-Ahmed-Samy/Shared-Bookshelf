import { useState, useCallback } from 'react';
import { loginUser, registerUser, storeToken } from '../api';
import { sfx } from '../sound';

const BOOKS = [
  { w: 24, h: 158, color: '#8b1a1a' },
  { w: 18, h: 112, color: '#1e3a5f' },
  { w: 30, h: 190, color: '#2d4a2d' },
  { w: 20, h: 134, color: '#5a2d82' },
  { w: 26, h: 176, color: '#7a4a1e' },
  { w: 16, h: 98,  color: '#1a4a4a' },
  { w: 28, h: 164, color: '#6b1a3a' },
  { w: 22, h: 148, color: '#2a3a6b' },
  { w: 18, h: 88,  color: '#4a2a1a' },
  { w: 32, h: 200, color: '#1a5a3a' },
  { w: 20, h: 122, color: '#5a1a5a' },
  { w: 24, h: 156, color: '#3a1a1a' },
  { w: 16, h: 102, color: '#1e4a6b' },
  { w: 26, h: 178, color: '#6b3a1a' },
  { w: 22, h: 136, color: '#2a5a2a' },
  { w: 18, h: 90,  color: '#4a1a4a' },
  { w: 28, h: 168, color: '#1a2a5a' },
  { w: 24, h: 144, color: '#7a2a1a' },
];

const BOOKS2 = [
  { w: 28, h: 144, color: '#2d4a6b' },
  { w: 20, h: 108, color: '#5a3a1a' },
  { w: 24, h: 166, color: '#1a4a2a' },
  { w: 18, h: 94,  color: '#6b1a6b' },
  { w: 30, h: 182, color: '#1a1a5a' },
  { w: 22, h: 128, color: '#7a1a2a' },
  { w: 16, h: 84,  color: '#2a4a3a' },
  { w: 26, h: 158, color: '#5a2a5a' },
  { w: 20, h: 118, color: '#3a5a1a' },
  { w: 28, h: 188, color: '#1a3a6b' },
  { w: 22, h: 138, color: '#6b3a3a' },
  { w: 18, h: 96,  color: '#2a2a6b' },
  { w: 24, h: 172, color: '#4a1a2a' },
  { w: 16, h: 106, color: '#1a5a5a' },
  { w: 30, h: 160, color: '#5a4a1a' },
];

function BookSpine({ w, h, color }) {
  const lighter = color + 'cc';
  return (
    <div
      className="lp-spine"
      style={{
        width: w,
        height: h,
        background: `linear-gradient(90deg, ${color} 0%, ${lighter} 40%, ${color} 100%)`,
      }}
      aria-hidden="true"
    />
  );
}

function getPasswordStrength(password) {
  if (!password) return { score: -1, label: '' };
  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/\d/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  const capped = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return { score: capped, label: labels[capped] };
}

function LoginPage({ onLoginSuccess, onRegisterSuccess, onGuestAccess, musicOn, onToggleMusic }) {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isLogin = tab === 'login';

  const switchTab = useCallback((next) => {
    setTab(next);
    setFieldError('');
    setSuccessMsg('');
    setPassword('');
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFieldError('');
    setSuccessMsg('');

    if (!email.trim() || !password.trim()) {
      setFieldError(isLogin ? 'Email and password are required.' : 'All fields are required.');
      sfx.error();
      return;
    }
    if (!isLogin && !username.trim()) {
      setFieldError('Username is required.');
      sfx.error();
      return;
    }

    setSubmitting(true);
    try {
      if (isLogin) {
        const result = await loginUser(email.trim(), password);
        storeToken(result.token);
        sfx.success();
        onLoginSuccess(result.token);
      } else {
        await registerUser(email.trim(), username.trim(), password);
        sfx.success();
        setSuccessMsg('Account created! You can now log in.');
        onRegisterSuccess();
        setTab('login');
        setUsername('');
        setPassword('');
      }
    } catch (err) {
      setFieldError(err.message || 'Authentication failed. Please try again.');
      sfx.error();
    } finally {
      setSubmitting(false);
    }
  }, [email, isLogin, onLoginSuccess, onRegisterSuccess, password, username]);

  return (
    <div className="lp-page">
      <div className="nf-ambient" aria-hidden="true">
        <span className="nf-blob nf-blob-1" />
        <span className="nf-blob nf-blob-2" />
        <span className="nf-blob nf-blob-3" />
      </div>

      {onToggleMusic && (
        <button
          className="nf-music-toggle lp-music-btn"
          onClick={onToggleMusic}
          aria-pressed={musicOn}
          aria-label={musicOn ? 'Turn off sound' : 'Turn on sound'}
        >
          <span className="nf-music-icon" aria-hidden="true">{musicOn ? '🔊' : '🔇'}</span>
        </button>
      )}

      {/* Left branding panel — hidden on small screens */}
      <aside className="lp-brand" aria-hidden="true">
        <div className="lp-shelf-wrap">
          <div className="lp-shelf">
            {BOOKS.map((b, i) => (
              <BookSpine key={i} {...b} />
            ))}
          </div>
          <div className="lp-shelf">
            {BOOKS2.map((b, i) => (
              <BookSpine key={i} {...b} />
            ))}
          </div>
        </div>
        <div className="lp-brand-text">
          <div className="lp-brand-icon">📚</div>
          <h1 className="lp-brand-logo">BOOKSHELF</h1>
          <p className="lp-brand-tagline">
            Track what you read.<br />
            Share what you love.<br />
            Own your shelf.
          </p>
        </div>
      </aside>

      {/* Right form panel */}
      <main className="lp-form-side">
        <div className="lp-card">
          {/* Mobile-only logo */}
          <div className="lp-mobile-logo" aria-hidden="true">
            <span className="lp-mobile-icon">📚</span>
            <span className="lp-mobile-title">BOOKSHELF</span>
          </div>

          <h2 className="lp-card-title">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="lp-card-subtitle">
            {isLogin
              ? 'Sign in to manage your shelf and collaborate with others.'
              : 'Join to add books, request edits, and own your collection.'}
          </p>

          <div className="lp-tabs" role="tablist">
            <button
              role="tab"
              aria-selected={isLogin}
              className={`lp-tab ${isLogin ? 'lp-tab--active' : ''}`}
              onClick={() => switchTab('login')}
              type="button"
            >
              Login
            </button>
            <button
              role="tab"
              aria-selected={!isLogin}
              className={`lp-tab ${!isLogin ? 'lp-tab--active' : ''}`}
              onClick={() => switchTab('register')}
              type="button"
            >
              Register
            </button>
          </div>

          <form className="lp-form" onSubmit={handleSubmit} noValidate>
            {!isLogin && (
              <div className="lp-field">
                <label className="lp-label" htmlFor="lp-username">Username</label>
                <input
                  id="lp-username"
                  className={`lp-input ${fieldError && !username.trim() ? 'lp-input--error' : ''}`}
                  type="text"
                  placeholder="e.g. johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  disabled={submitting}
                />
              </div>
            )}

            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-email">Email</label>
              <input
                id="lp-email"
                className="lp-input"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={isLogin ? 'username' : 'email'}
                disabled={submitting}
              />
            </div>

            <div className="lp-field">
              <label className="lp-label" htmlFor="lp-password">Password</label>
              <input
                id="lp-password"
                className="lp-input"
                type="password"
                  placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                disabled={submitting}
              />
              {!isLogin && password && (
                <div className="lp-strength" aria-live="polite">
                  <div className="lp-strength-track">
                    <div className={`lp-strength-fill lp-strength-fill--${getPasswordStrength(password).score}`} />
                  </div>
                  <div className="lp-strength-label">Password strength: {getPasswordStrength(password).label}</div>
                </div>
              )}
            </div>

            {fieldError && (
              <div className="lp-msg lp-msg--error" role="alert">{fieldError}</div>
            )}
            {successMsg && (
              <div className="lp-msg lp-msg--success" role="status">{successMsg}</div>
            )}

            <button
              type="submit"
              className="lp-submit"
              disabled={submitting}
            >
              {submitting ? 'Working…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {isLogin ? (
            <p className="lp-switch-hint">
              <button
                type="button"
                className="lp-guest-btn"
                onClick={onGuestAccess}
              >
                Continue as guest
              </button>
            </p>
          ) : (
            <p className="lp-switch-hint">
              Already have an account?{' '}
              <button
                type="button"
                className="lp-switch-btn"
                onClick={() => switchTab('login')}
              >
                Sign in
              </button>
            </p>
          )}
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
