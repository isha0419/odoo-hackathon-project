import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/auth';
import { ApiError } from '../api/client';
import './Login.css';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await authApi.signup(name, email, password);
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create your account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword() {
    setError('');
    if (!email) {
      setError('Enter your email above first, then click "Forgot password".');
      return;
    }
    try {
      await authApi.forgotPassword(email);
      setNotice('If an account exists for that email, reset instructions have been sent.');
    } catch {
      setNotice('If an account exists for that email, reset instructions have been sent.');
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1 className="login-title">AssetFlow — login</h1>
        <div className="login-logo">AF</div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            {error && <div className="form-error">{error}</div>}
            {notice && <div className="banner banner-info" style={{ marginBottom: 14 }}>{notice}</div>}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                className="input"
                type="password"
                placeholder="••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="button" className="login-forgot" onClick={handleForgotPassword}>
                Forgot password
              </button>
            </div>

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? 'Logging in…' : 'Log In'}
            </button>

            <div className="login-divider">
              <span>New here?</span>
            </div>

            <p className="login-note">Sign up creates an employee account — admin roles assigned later.</p>

            <button
              type="button"
              className="btn login-switch"
              onClick={() => {
                setMode('signup');
                setError('');
                setNotice('');
              }}
            >
              Create Account
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            {error && <div className="form-error">{error}</div>}

            <div className="field">
              <label htmlFor="name">Full name</label>
              <input
                id="name"
                className="input"
                type="text"
                placeholder="Jordan Lee"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label htmlFor="signup-email">Email</label>
              <input
                id="signup-email"
                className="input"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="signup-password">Password</label>
              <input
                id="signup-password"
                className="input"
                type="password"
                placeholder="At least 6 characters"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <p className="login-note">Sign up creates an employee account — admin roles assigned later.</p>

            <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>

            <button
              type="button"
              className="btn btn-ghost login-switch"
              onClick={() => {
                setMode('login');
                setError('');
              }}
            >
              Already have an account? Log in
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
