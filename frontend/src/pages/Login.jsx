import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card/Card';
import Button from '../components/Button/Button';
import { setToken } from '../utils/api';
import './Login.css';

// Screen 1 — Login / Signup
// Owner: Yash
// TODO(Yash): wire up real POST /auth/login + POST /auth/signup calls via `api`.
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    // Placeholder: replace with real api.post('/auth/login', { email, password })
    setToken('dev-placeholder-token');
    navigate('/dashboard');
  }

  return (
    <div className="login-screen">
      <Card className="login-card">
        <div className="login-card__brand">
          <span className="login-card__logo">AF</span>
          <h1>AssetFlow — login</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="login-field">
            Email
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="login-field">
            Password
            <input
              type="password"
              placeholder="••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          <a className="login-forgot" href="#">
            Forgot password
          </a>

          <Button type="submit" variant="primary" className="login-submit">
            Log in
          </Button>
        </form>

        <div className="login-divider">New here?</div>

        <p className="login-signup-note">
          Sign up creates an employee account — admin roles assigned later.
        </p>

        <Button variant="secondary" className="login-submit">
          Create Account
        </Button>
      </Card>
    </div>
  );
}