import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';
import { Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      // Interceptor unwraps {success, data} -> res.data = {user: {...}}
      const user = res.data?.user || res.data;
      if (!user || !user.email) {
        throw new Error('Invalid response from server');
      }
      // Persist auth for page reloads
      localStorage.setItem('knowai-user', JSON.stringify(user));
      localStorage.setItem('knowai-authenticated', 'true');
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      // Redirect based on onboarding status
      if (user.onboardingComplete === false) {
        navigate('/onboarding');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid credentials';
      if (status === 403 && serverMsg.toLowerCase().includes('disabled')) {
        setError('Your account has been disabled due to incomplete profile. Contact HR.');
      } else {
        setError(serverMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexWrap: 'wrap' }}>
      {/* Left - Brand */}
      <div className="hide-mobile" style={{
        flex: 1, minWidth: 320, background: 'linear-gradient(135deg, #05121B 0%, #0148A7 50%, #146DF7 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, background: 'radial-gradient(circle at 30% 70%, #146DF7 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#146DF7', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, fontWeight: 800, color: '#fff' }}>K</div>
          <h1 style={{ color: '#fff', fontSize: 42, fontWeight: 800, margin: '0 0 8px', letterSpacing: -1 }}>Know<span style={{ color: '#CFF0FF', fontWeight: 400 }}>AI</span></h1>
          <p style={{ color: '#A6B5BF', fontSize: 16, maxWidth: 360, lineHeight: 1.6 }}>
            Empowering people to work with AI. Enterprise management that scales with your team.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div style={{
        flex: '1 1 320px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 24px', background: '#FAFAFA', minWidth: 0
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>Welcome back</h2>
          <p style={{ color: '#5B6B76', marginBottom: 32 }}>Sign in to your Know AI workspace</p>

          {error && (
            <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="kai-label">Email Address</label>
              <input className="kai-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <label className="kai-label">Password</label>
              <input className="kai-input" type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required style={{ paddingRight: 42 }} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: 12, top: 30, background: 'none', border: 'none', cursor: 'pointer', color: '#5B6B76' }}>
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4C5963', cursor: 'pointer' }}>
                <input type="checkbox" /> Remember me
              </label>
              <a href="#" style={{ fontSize: 13, color: '#146DF7' }}>Forgot password?</a>
            </div>
            <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#5B6B76' }}>
            Contact your admin for account access
          </p>
        </div>
      </div>
    </div>
  );
}
