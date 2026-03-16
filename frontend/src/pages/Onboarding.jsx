import { useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { onboardingApi } from '../services/api';
import { Check, ChevronRight, ChevronLeft, Upload, User, Briefcase, Shield, FileText, X } from 'lucide-react';

const STEPS = [
  { label: 'Personal Details', icon: User },
  { label: 'Professional Details', icon: Briefcase },
  { label: 'Security', icon: Shield },
  { label: 'Documents', icon: FileText },
];

const SECRET_QUESTIONS = [
  "What is your pet's name?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was your first school?",
];

const PRIMARY = '#146DF7';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s) => s.auth.user);
  const resumeRef = useRef(null);
  const govIdRef = useRef(null);

  // Form state
  const [form, setForm] = useState({
    dateOfBirth: '',
    phone: user?.phone || '',
    bio: '',
    profilePhoto: null,
    department: user?.department || '',
    designation: user?.designation || '',
    skills: '',
    linkedinUrl: '',
    secretQuestion: SECRET_QUESTIONS[0],
    secretAnswer: '',
    agreeTerms: false,
    resume: null,
    govId: null,
  });

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const canProceed = () => {
    if (step === 0) return form.dateOfBirth && form.phone;
    if (step === 1) return true;
    if (step === 2) return form.secretQuestion && form.secretAnswer && form.agreeTerms;
    if (step === 3) return true;
    return true;
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      setError('');
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
      setError('');
    }
  };

  const handleComplete = async () => {
    setError('');
    setLoading(true);
    try {
      const fd = new FormData();
      if (form.dateOfBirth) fd.append('dateOfBirth', form.dateOfBirth);
      if (form.phone) fd.append('phone', form.phone);
      if (form.bio) fd.append('bio', form.bio);
      if (form.department) fd.append('department', form.department);
      if (form.designation) fd.append('designation', form.designation);
      fd.append('secretQuestion', form.secretQuestion);
      fd.append('secretAnswer', form.secretAnswer);
      if (form.resume) fd.append('resume', form.resume);

      const res = await onboardingApi.complete(fd);
      const updatedUser = res.data?.user || res.data;

      // Update stored user with onboardingComplete = true
      const currentUser = JSON.parse(localStorage.getItem('knowai-user') || '{}');
      const mergedUser = { ...currentUser, ...updatedUser, onboardingComplete: true };
      localStorage.setItem('knowai-user', JSON.stringify(mergedUser));
      dispatch({ type: 'AUTH_SUCCESS', payload: mergedUser });

      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Failed to complete onboarding';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Styles
  const cardStyle = {
    background: '#fff',
    borderRadius: 16,
    padding: '40px 36px',
    maxWidth: 560,
    width: '100%',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1.5px solid #D1D9E0',
    fontSize: 14,
    outline: 'none',
    transition: 'border-color 0.2s',
    background: '#FAFBFC',
  };

  const labelStyle = {
    display: 'block',
    fontSize: 13,
    fontWeight: 600,
    color: '#344054',
    marginBottom: 6,
  };

  const fieldGap = { marginBottom: 20 };

  const renderFileButton = (label, file, inputRef, fieldKey, accept) => (
    <div style={fieldGap}>
      <label style={labelStyle}>{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => set(fieldKey, e.target.files?.[0] || null)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        style={{
          border: '2px dashed #D1D9E0',
          borderRadius: 10,
          padding: '24px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          background: file ? '#F0F7FF' : '#FAFBFC',
          transition: 'all 0.2s',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FileText size={18} color={PRIMARY} />
            <span style={{ fontSize: 14, color: '#344054' }}>{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); set(fieldKey, null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} color="#888" />
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} color="#9CA3AF" />
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#6B7280' }}>
              Click to upload or drag & drop
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #F0F4FF 0%, #E8F0FE 50%, #F5F7FA 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 16px',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          width: 48, height: 48, background: PRIMARY, borderRadius: 12,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800, color: '#fff', marginBottom: 12,
        }}>K</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: '#10222F', margin: '0 0 4px' }}>
          Welcome to Know AI
        </h1>
        <p style={{ color: '#5B6B76', fontSize: 14 }}>
          Complete your profile to get started
        </p>
      </div>

      {/* Progress Stepper */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 0, marginBottom: 32, maxWidth: 560, width: '100%', padding: '0 8px',
      }}>
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 36, borderRadius: '50%',
                background: isDone ? PRIMARY : isActive ? PRIMARY : '#E5E7EB',
                color: isDone || isActive ? '#fff' : '#9CA3AF',
                fontSize: 13, fontWeight: 600, flexShrink: 0,
                transition: 'all 0.3s',
              }}>
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 3, margin: '0 6px',
                  background: i < step ? PRIMARY : '#E5E7EB',
                  borderRadius: 2, transition: 'background 0.3s',
                }} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Label */}
      <p style={{ fontSize: 15, fontWeight: 600, color: PRIMARY, marginBottom: 16 }}>
        Step {step + 1}: {STEPS[step].label}
      </p>

      {/* Card */}
      <div style={cardStyle}>
        {error && (
          <div style={{
            background: '#FEF2F2', color: '#B91C1C', padding: '10px 16px',
            borderRadius: 8, marginBottom: 20, fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Step 1: Personal Details */}
        {step === 0 && (
          <>
            <div style={fieldGap}>
              <label style={labelStyle}>Date of Birth *</label>
              <input
                type="date"
                style={inputStyle}
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Phone Number *</label>
              <input
                type="tel"
                style={inputStyle}
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Bio</label>
              <textarea
                style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                placeholder="Tell us a bit about yourself..."
                maxLength={200}
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
              />
              <span style={{ fontSize: 12, color: '#9CA3AF', float: 'right' }}>
                {form.bio.length}/200
              </span>
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Profile Photo (optional)</label>
              <input type="file" accept="image/*" style={inputStyle} onChange={(e) => set('profilePhoto', e.target.files?.[0])} />
            </div>
          </>
        )}

        {/* Step 2: Professional Details */}
        {step === 1 && (
          <>
            <div style={fieldGap}>
              <label style={labelStyle}>Department</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
              />
              {user?.department && (
                <span style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'block' }}>
                  Pre-filled from admin settings
                </span>
              )}
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Designation</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="e.g. Senior Developer"
                value={form.designation}
                onChange={(e) => set('designation', e.target.value)}
              />
              {user?.designation && (
                <span style={{ fontSize: 12, color: '#6B7280', marginTop: 4, display: 'block' }}>
                  Pre-filled from admin settings
                </span>
              )}
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Skills</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="React, Node.js, Python (comma-separated)"
                value={form.skills}
                onChange={(e) => set('skills', e.target.value)}
              />
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>LinkedIn URL (optional)</label>
              <input
                type="url"
                style={inputStyle}
                placeholder="https://linkedin.com/in/yourname"
                value={form.linkedinUrl}
                onChange={(e) => set('linkedinUrl', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Step 3: Security */}
        {step === 2 && (
          <>
            <div style={fieldGap}>
              <label style={labelStyle}>Secret Question *</label>
              <select
                style={inputStyle}
                value={form.secretQuestion}
                onChange={(e) => set('secretQuestion', e.target.value)}
              >
                {SECRET_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div style={fieldGap}>
              <label style={labelStyle}>Secret Answer *</label>
              <input
                type="text"
                style={inputStyle}
                placeholder="Your answer (case-sensitive)"
                value={form.secretAnswer}
                onChange={(e) => set('secretAnswer', e.target.value)}
              />
            </div>
            <div style={{ ...fieldGap, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                id="agreeTerms"
                checked={form.agreeTerms}
                onChange={(e) => set('agreeTerms', e.target.checked)}
                style={{ marginTop: 3, accentColor: PRIMARY }}
              />
              <label htmlFor="agreeTerms" style={{ fontSize: 13, color: '#344054', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the <a href="#" style={{ color: PRIMARY }}>Terms of Service</a> and{' '}
                <a href="#" style={{ color: PRIMARY }}>Privacy Policy</a> of Know AI.
              </label>
            </div>
          </>
        )}

        {/* Step 4: Documents */}
        {step === 3 && (
          <>
            {renderFileButton('Resume (PDF/DOCX, max 10MB)', form.resume, resumeRef, 'resume', '.pdf,.docx,.doc')}
            {renderFileButton('Government ID (optional)', form.govId, govIdRef, 'govId', '.pdf,.jpg,.jpeg,.png')}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 28, gap: 12 }}>
          {step > 0 ? (
            <button
              onClick={handleBack}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 20px', borderRadius: 8,
                border: '1.5px solid #D1D9E0', background: '#fff',
                fontSize: 14, fontWeight: 600, color: '#344054',
                cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 24px', borderRadius: 8,
                border: 'none', background: canProceed() ? PRIMARY : '#D1D9E0',
                fontSize: 14, fontWeight: 600, color: '#fff',
                cursor: canProceed() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s',
              }}
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading || !canProceed()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '10px 24px', borderRadius: 8,
                border: 'none',
                background: (loading || !canProceed()) ? '#D1D9E0' : PRIMARY,
                fontSize: 14, fontWeight: 600, color: '#fff',
                cursor: (loading || !canProceed()) ? 'not-allowed' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {loading ? 'Completing...' : 'Complete Setup'}
              {!loading && <Check size={16} />}
            </button>
          )}
        </div>
      </div>

      {/* Footer */}
      <p style={{ marginTop: 24, fontSize: 12, color: '#9CA3AF' }}>
        Know AI ERP - Your workspace is being prepared
      </p>
    </div>
  );
}
