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

  const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[13px]';
  const labelClass = 'block text-[12px] font-semibold text-[var(--text-secondary)] mb-1.5';
  const btnPrimary = 'w-full bg-[#7C3AED] text-white rounded-lg px-4 py-2.5 text-[14px] font-semibold hover:bg-[#7C3AED]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2';

  const renderForgotFlow = () => {
    const backBtn = (
      <button type="button" onClick={resetForgot} className="flex items-center gap-1.5 text-[#3B82F6] text-[13px] mb-6 hover:underline" data-testid="back-to-signin">
        <ArrowLeft size={16} /> Back to sign in
      </button>
    );

    if (forgotMode === 'lookupEmail') {
      return (
        <div>
          {backBtn}
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">Find Your Email</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-[13px]">Enter your phone number to find your account email</p>
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{error}</div>}
          {forgotSuccess && <div className="bg-green-500/10 text-green-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{forgotSuccess}</div>}
          <form onSubmit={handleLookupEmail}>
            <div className="mb-5">
              <label className={labelClass}>Phone Number</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input className={`${inputClass} pl-9`} type="tel" value={forgotPhone} onChange={e => setForgotPhone(e.target.value)} placeholder="+91 98765 43210" required data-testid="forgot-phone" />
              </div>
            </div>
            <button type="submit" className={btnPrimary} disabled={loading} data-testid="find-email-btn">
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
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">Reset Password</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-[13px]">Enter your email address to find your account</p>
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{error}</div>}
          <form onSubmit={handleFindAccount}>
            <div className="mb-5">
              <label className={labelClass}>Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input className={`${inputClass} pl-9`} type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} placeholder="you@knowai.biz" required data-testid="forgot-email" />
              </div>
            </div>
            <button type="submit" className={btnPrimary} disabled={loading} data-testid="find-account-btn">
              {loading ? 'Finding...' : 'Find Account'}
            </button>
          </form>
          <p className="text-center mt-4 text-[13px]">
            <button type="button" onClick={() => setForgotMode('lookupEmail')} className="text-[#3B82F6] hover:underline text-[13px]">
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
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">Verify Identity</h2>
          <p className="text-[var(--text-secondary)] mb-2 text-[13px]">Account found: {foundAccount?.maskedEmail}</p>
          <p className="text-[var(--text-secondary)] mb-6 text-[13px]">Enter your 2FA verification code to continue</p>
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{error}</div>}
          <form onSubmit={handleVerify}>
            <div className="mb-5">
              <label className={labelClass}>2FA Code or Backup Code</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input className={`${inputClass} pl-9 tracking-widest font-mono`} value={verifyCode} onChange={e => setVerifyCode(e.target.value)} placeholder="Enter code" required data-testid="verify-code" />
              </div>
            </div>
            <button type="submit" className={btnPrimary} disabled={loading} data-testid="verify-btn">
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
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-2">Set New Password</h2>
          <p className="text-[var(--text-secondary)] mb-6 text-[13px]">Create a strong password for your account</p>
          {error && <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{error}</div>}
          {forgotSuccess && <div className="bg-green-500/10 text-green-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{forgotSuccess}</div>}
          <form onSubmit={handleResetPassword}>
            <div className="mb-5">
              <label className={labelClass}>New Password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input className={`${inputClass} pl-9`} type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="Min 8 characters" required minLength={8} data-testid="new-password" />
              </div>
            </div>
            <div className="mb-5">
              <label className={labelClass}>Confirm Password</label>
              <input className={inputClass} type="password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)} placeholder="Confirm password" required data-testid="confirm-password" />
            </div>
            <button type="submit" className={btnPrimary} disabled={loading} data-testid="reset-password-btn">
              {loading ? 'Resetting...' : 'Reset Password'}
            </button>
          </form>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen flex-wrap">
      {/* Left - Brand */}
      <div className="hidden md:flex flex-1 min-w-[320px] flex-col items-center justify-center p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #05121B 0%, #1E3A5F 50%, #111827 100%)' }}>
        <div className="absolute inset-0 opacity-5" style={{ background: 'radial-gradient(circle at 30% 70%, #3B82F6 0%, transparent 50%)' }} />
        <div className="relative z-10 text-center">
          <div className="w-[72px] h-[72px] bg-[#111827] rounded-2xl flex items-center justify-center mx-auto mb-6 text-[28px] font-extrabold text-white">K</div>
          <h1 className="text-white text-[42px] font-extrabold mb-2 tracking-tight">
            Know<span className="text-[#CFF0FF] font-normal">AI</span>
          </h1>
          <p className="text-[#A6B5BF] text-[16px] max-w-[360px] leading-relaxed">
            Empowering people to work with AI. Enterprise management that scales with your team.
          </p>
        </div>
      </div>

      {/* Right - Form */}
      <div className="flex-1 min-w-0 flex items-center justify-center p-12 bg-[var(--bg-primary)]" style={{ flexBasis: '320px' }}>
        <div className="w-full max-w-[400px]">
          {forgotMode ? renderForgotFlow() : (
            <>
              <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">Welcome back</h2>
              <p className="text-[var(--text-secondary)] mb-8">Sign in to your Know AI workspace</p>

              {error && (
                <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]" data-testid="login-error">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-5">
                  <label className={labelClass}>Email Address</label>
                  <input className={inputClass} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@knowai.biz" required data-testid="login-email" />
                </div>
                <div className="mb-5 relative">
                  <label className={labelClass}>Password</label>
                  <input className={`${inputClass} pr-10`} type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required data-testid="login-password" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-[30px] text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <div className="flex justify-between items-center mb-6">
                  <label className="flex items-center gap-2 text-[13px] text-[var(--text-secondary)] cursor-pointer">
                    <input type="checkbox" className="accent-[#7C3AED]" /> Remember me
                  </label>
                  <button type="button" onClick={() => setForgotMode('find')} className="text-[13px] text-[#3B82F6] hover:underline">Forgot password?</button>
                </div>
                <button type="submit" className={btnPrimary} disabled={loading} data-testid="login-submit">
                  {loading ? 'Signing in...' : <>Sign In <ArrowRight size={18} /></>}
                </button>
              </form>

              <p className="text-center mt-6 text-[13px] text-[var(--text-muted)]">
                Contact your admin for account access
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
