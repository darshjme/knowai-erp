import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { Eye, EyeOff, ArrowRight, ArrowLeft, Phone, Mail, Shield, KeyRound } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(null); // null | 'find' | 'verify' | 'reset' | 'lookupEmail'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotPhone, setForgotPhone] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [foundAccount, setFoundAccount] = useState(null);
  const [forgotSuccess, setForgotSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login({ email, password });
      const user = res.data?.user || res.data;
      if (!user || !user.email) throw new Error('Invalid response from server');
      localStorage.setItem('knowai-user', JSON.stringify(user));
      localStorage.setItem('knowai-authenticated', 'true');
      dispatch({ type: 'AUTH_SUCCESS', payload: user });
      navigate(user.onboardingComplete === false ? '/onboarding' : '/dashboard');
    } catch (err) {
      const status = err.response?.status;
      const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Invalid credentials';
      if (status === 403 && serverMsg.toLowerCase().includes('disabled')) {
        setError('Your account has been disabled due to incomplete profile. Contact HR.');
      } else {
        setError(serverMsg);
      }
    } finally { setLoading(false); }
  };

  const handleFindAccount = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ action: 'findAccount', email: forgotEmail || undefined, phone: forgotPhone || undefined }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Account not found');
      const d = data.data || data;
      setFoundAccount(d);
      if (d.has2FA) {
        setForgotMode('verify');
      } else {
        setError('2FA is not enabled on this account. Contact HR to reset your password.');
      }
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ action: 'verifyIdentity', userId: foundAccount?.userId, verificationCode: verifyCode }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');
      setResetToken(data.data?.resetToken);
      setForgotMode('reset');
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPass !== confirmPass) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ action: 'resetPassword', resetToken, newPassword: newPass }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Reset failed');
      setForgotSuccess('Password reset successfully! You can now sign in.');
      setTimeout(() => { setForgotMode(null); setForgotSuccess(''); }, 3000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleLookupEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ action: 'lookupEmail', phone: forgotPhone }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Not found');
      setForgotSuccess(`Your email is: ${data.data?.email}`);
      setTimeout(() => { setForgotMode(null); setForgotSuccess(''); setEmail(data.data?.email || ''); }, 4000);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetForgot = () => {
    setForgotMode(null);
    setFoundAccount(null);
    setResetToken('');
    setVerifyCode('');
    setNewPass('');
    setConfirmPass('');
    setForgotEmail('');
    setForgotPhone('');
    setError('');
    setForgotSuccess('');
  };

  // Render forgot password flows
  const renderForgotFlow = () => {
    const backBtn = (
      <button type="button" onClick={resetForgot} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13, marginBottom: 24, padding: 0 }}>
        <ArrowLeft size={16} /> Back to sign in
      </button>
    );

    if (forgotMode === 'lookupEmail') {
      return (
        <div>
          {backBtn}
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>Find Your Email</h2>
          <p style={{ color: '#5B6B76', marginBottom: 24, fontSize: 13 }}>Enter your phone number to find your account email</p>
          {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          {forgotSuccess && <div style={{ background: '#d4edda', color: '#155724', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{forgotSuccess}</div>}
          <form onSubmit={handleLookupEmail}>
            <div style={{ marginBottom: 20 }}>
              <label className="kai-label">Phone Number</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#5B6B76' }} />
                <input className="kai-input" type="tel" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} placeholder="+91 98765 43210" required style={{ paddingLeft: 36 }} />
              </div>
            </div>
            <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Searching...' : 'Find My Email'}
            </button>
          </form>
        </div>
      );
    }

    if (forgotMode === 'find') {
      return (
        <div>
          {backBtn}
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>Reset Password</h2>
          <p style={{ color: '#5B6B76', marginBottom: 24, fontSize: 13 }}>Enter your email address to find your account</p>
          {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleFindAccount}>
            <div style={{ marginBottom: 20 }}>
              <label className="kai-label">Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#5B6B76' }} />
                <input className="kai-input" type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@knowai.biz" required style={{ paddingLeft: 36 }} />
              </div>
            </div>
            <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Finding...' : 'Find Account'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 16, fontSize: 13 }}>
            <button type="button" onClick={() => setForgotMode('lookupEmail')} style={{ background: 'none', border: 'none', color: '#3B82F6', cursor: 'pointer', fontSize: 13 }}>
              Forgot email? Use phone number
            </button>
          </p>
        </div>
      );
    }

    if (forgotMode === 'verify') {
      return (
        <div>
          {backBtn}
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>Verify Identity</h2>
          <p style={{ color: '#5B6B76', marginBottom: 8, fontSize: 13 }}>Account found: {foundAccount?.maskedEmail}</p>
          <p style={{ color: '#5B6B76', marginBottom: 24, fontSize: 13 }}>Enter your 2FA verification code to continue</p>
          {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          <form onSubmit={handleVerify}>
            <div style={{ marginBottom: 20 }}>
              <label className="kai-label">2FA Code or Backup Code</label>
              <div style={{ position: 'relative' }}>
                <Shield size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#5B6B76' }} />
                <input className="kai-input" value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="Enter code" required style={{ paddingLeft: 36, letterSpacing: 2, fontFamily: 'monospace' }} />
              </div>
            </div>
            <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>
        </div>
      );
    }

    if (forgotMode === 'reset') {
      return (
        <div>
          {backBtn}
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>Set New Password</h2>
          <p style={{ color: '#5B6B76', marginBottom: 24, fontSize: 13 }}>Create a strong password for your account</p>
          {error && <div style={{ background: '#f8d7da', color: '#721c24', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{error}</div>}
          {forgotSuccess && <div style={{ background: '#d4edda', color: '#155724', padding: '10px 16px', borderRadius: 8, marginBottom: 16, fontSize: 13 }}>{forgotSuccess}</div>}
          <form onSubmit={handleResetPassword}>
            <div style={{ marginBottom: 20, position: 'relative' }}>
              <label className="kai-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={16} style={{ position: 'absolute', left: 12, top: 10, color: '#5B6B76' }} />
                <input className="kai-input" type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" required minLength={8} style={{ paddingLeft: 36 }} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label className="kai-label">Confirm Password</label>
              <input className="kai-input" type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm password" required />
            </div>
            <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexWrap: 'wrap' }}>
      {/* Left - Brand */}
      <div className="hide-mobile" style={{
        flex: 1, minWidth: 320, background: 'linear-gradient(135deg, #05121B 0%, #1E3A5F 50%, #111827 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, position: 'relative', overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.05, background: 'radial-gradient(circle at 30% 70%, #3B82F6 0%, transparent 50%)' }} />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, background: '#111827', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: 28, fontWeight: 800, color: '#fff' }}>K</div>
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
          {forgotMode ? renderForgotFlow() : (
            <>
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
                  <input className="kai-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@knowai.biz" required />
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
                  <button type="button" onClick={() => setForgotMode('find')} style={{ background: 'none', border: 'none', fontSize: 13, color: '#3B82F6', cursor: 'pointer' }}>Forgot password?</button>
                </div>
                <button type="submit" className="kai-btn kai-btn-primary kai-btn-lg" style={{ width: '100%' }} disabled={loading}>
                  {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#5B6B76' }}>
                Contact your admin for account access
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
