import { useState, useRef, useEffect } from 'react';
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

const PRIMARY = '#007AFF';
const PRIMARY_HOVER = '#0066D6';

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((s: any) => s.auth.user);
  const resumeRef = useRef<HTMLInputElement>(null);
  const govIdRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    dateOfBirth: '',
    phone: user?.phone || '',
    bio: '',
    profilePhoto: null as File | null,
    department: user?.department || '',
    designation: user?.designation || '',
    skills: '',
    linkedinUrl: '',
    secretQuestion: SECRET_QUESTIONS[0],
    secretAnswer: '',
    agreeTerms: false,
    resume: null as File | null,
    govId: null as File | null,
  });

  // Load saved progress on mount
  useEffect(() => {
    onboardingApi.getStatus?.()
      .then((res: any) => {
        const d = res.data?.data || res.data;
        if (d) {
          setStep(d.onboardingStep || 0);
          setForm((f) => ({
            ...f,
            dateOfBirth: d.dateOfBirth ? new Date(d.dateOfBirth).toISOString().split('T')[0] : '',
            phone: d.phone || f.phone,
            bio: d.bio || '',
            department: d.department || f.department,
            designation: d.designation || f.designation,
            skills: d.skills || '',
            linkedinUrl: d.linkedinUrl || '',
            secretQuestion: d.secretQuestion || SECRET_QUESTIONS[0],
          }));
        }
      })
      .catch(() => {});
  }, []);

  const set = (key: string, val: any) => setForm((f) => ({ ...f, [key]: val }));

  const canProceed = () => {
    if (step === 0) return form.dateOfBirth && form.phone;
    if (step === 1) return true;
    if (step === 2) return form.secretQuestion && form.secretAnswer && form.agreeTerms;
    if (step === 3) return true;
    return true;
  };

  // Save progress when advancing steps
  const saveProgress = async (nextStep: number) => {
    setSaving(true);
    try {
      await onboardingApi.saveProgress?.({
        step: nextStep,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone || undefined,
        bio: form.bio || undefined,
        department: form.department || undefined,
        designation: form.designation || undefined,
        skills: form.skills || undefined,
        linkedinUrl: form.linkedinUrl || undefined,
        secretQuestion: form.secretQuestion || undefined,
        secretAnswer: form.secretAnswer || undefined,
      });
    } catch {
      // Progress save is best-effort — don't block the wizard
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      await saveProgress(step);
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
      if (form.skills) fd.append('skills', form.skills);
      if (form.linkedinUrl) fd.append('linkedinUrl', form.linkedinUrl);
      fd.append('secretQuestion', form.secretQuestion);
      fd.append('secretAnswer', form.secretAnswer);
      if (form.resume) fd.append('resume', form.resume);
      if (form.govId) fd.append('govId', form.govId);
      if (form.profilePhoto) fd.append('profilePhoto', form.profilePhoto);

      const res = await onboardingApi.complete(fd);
      const updatedUser = res.data?.user || res.data;

      const currentUser = JSON.parse(localStorage.getItem('knowai-user') || '{}');
      const mergedUser = { ...currentUser, ...updatedUser, onboardingComplete: true };
      localStorage.setItem('knowai-user', JSON.stringify(mergedUser));
      dispatch({ type: 'AUTH_SUCCESS', payload: mergedUser });

      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to complete onboarding';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const renderFileButton = (label: string, file: File | null, inputRef: React.RefObject<HTMLInputElement | null>, fieldKey: string, accept: string) => (
    <div style={{ marginBottom: 24 }}>
      <label className="onboarding-label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        style={{ display: 'none' }}
        onChange={(e) => set(fieldKey, e.target.files?.[0] || null)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="onboarding-upload-zone"
        style={{
          background: file ? 'rgba(0, 122, 255, 0.05)' : 'rgba(245, 245, 247, 0.8)',
        }}
      >
        {file ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <FileText size={18} color={PRIMARY} />
            <span style={{ fontSize: 14, color: '#1D1D1F' }}>{file.name}</span>
            <button
              onClick={(e) => { e.stopPropagation(); set(fieldKey, null); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
            >
              <X size={16} color="#86868B" />
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} color="#AEAEB2" />
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#86868B' }}>
              Click to upload or drag & drop
            </p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="onboarding-page">
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div className="onboarding-logo">K</div>
        <h1 className="onboarding-title">Welcome to Know AI</h1>
        <p className="onboarding-subtitle">Complete your profile to get started</p>
      </div>

      {/* Progress Stepper */}
      <div className="onboarding-stepper">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div
                className="onboarding-step-icon"
                style={{
                  background: isDone || isActive ? PRIMARY : 'rgba(0, 0, 0, 0.06)',
                  color: isDone || isActive ? '#fff' : '#AEAEB2',
                }}
              >
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="onboarding-step-line"
                  style={{ background: i < step ? PRIMARY : 'rgba(0, 0, 0, 0.06)' }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Label */}
      <p className="onboarding-step-label">
        Step {step + 1}: {STEPS[step].label}
        {saving && <span style={{ fontSize: 12, color: '#86868B', marginLeft: 8 }}>Saving...</span>}
      </p>

      {/* Card — Glass surface */}
      <div className="onboarding-card">
        {error && (
          <div className="onboarding-error">{error}</div>
        )}

        {/* Step 0: Personal Details */}
        {step === 0 && (
          <>
            <div className="onboarding-field">
              <label className="onboarding-label">Date of Birth *</label>
              <input
                type="date"
                className="onboarding-input"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Phone Number *</label>
              <input
                type="tel"
                className="onboarding-input"
                placeholder="+91 98765 43210"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Bio</label>
              <textarea
                className="onboarding-input"
                style={{ minHeight: 80, resize: 'vertical' }}
                placeholder="Tell us a bit about yourself..."
                maxLength={200}
                value={form.bio}
                onChange={(e) => set('bio', e.target.value)}
              />
              <span style={{ fontSize: 12, color: '#AEAEB2', float: 'right', marginTop: 4 }}>
                {form.bio.length}/200
              </span>
            </div>
          </>
        )}

        {/* Step 1: Professional Details */}
        {step === 1 && (
          <>
            <div className="onboarding-field">
              <label className="onboarding-label">Department</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="e.g. Engineering"
                value={form.department}
                onChange={(e) => set('department', e.target.value)}
              />
              {user?.department && (
                <span style={{ fontSize: 12, color: '#86868B', marginTop: 4, display: 'block' }}>
                  Pre-filled from admin settings
                </span>
              )}
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Designation</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="e.g. Senior Developer"
                value={form.designation}
                onChange={(e) => set('designation', e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Skills</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="React, Node.js, Python (comma-separated)"
                value={form.skills}
                onChange={(e) => set('skills', e.target.value)}
              />
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">LinkedIn URL (optional)</label>
              <input
                type="url"
                className="onboarding-input"
                placeholder="https://linkedin.com/in/yourname"
                value={form.linkedinUrl}
                onChange={(e) => set('linkedinUrl', e.target.value)}
              />
            </div>
          </>
        )}

        {/* Step 2: Security */}
        {step === 2 && (
          <>
            <div className="onboarding-field">
              <label className="onboarding-label">Secret Question *</label>
              <select
                className="onboarding-input"
                value={form.secretQuestion}
                onChange={(e) => set('secretQuestion', e.target.value)}
              >
                {SECRET_QUESTIONS.map((q) => (
                  <option key={q} value={q}>{q}</option>
                ))}
              </select>
            </div>
            <div className="onboarding-field">
              <label className="onboarding-label">Secret Answer *</label>
              <input
                type="text"
                className="onboarding-input"
                placeholder="Your answer (case-sensitive)"
                value={form.secretAnswer}
                onChange={(e) => set('secretAnswer', e.target.value)}
              />
            </div>
            <div className="onboarding-field" style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input
                type="checkbox"
                id="agreeTerms"
                checked={form.agreeTerms}
                onChange={(e) => set('agreeTerms', e.target.checked)}
                style={{ marginTop: 3, accentColor: PRIMARY }}
              />
              <label htmlFor="agreeTerms" style={{ fontSize: 13, color: '#1D1D1F', cursor: 'pointer', lineHeight: 1.5 }}>
                I agree to the Terms of Service and Privacy Policy of Know AI.
              </label>
            </div>
          </>
        )}

        {/* Step 3: Documents */}
        {step === 3 && (
          <>
            {renderFileButton('Profile Photo (JPEG/PNG, max 5MB)', form.profilePhoto, photoRef, 'profilePhoto', '.jpg,.jpeg,.png,.webp')}
            {renderFileButton('Resume (PDF/DOCX, max 10MB)', form.resume, resumeRef, 'resume', '.pdf,.docx,.doc')}
            {renderFileButton('Government ID (optional)', form.govId, govIdRef, 'govId', '.pdf,.jpg,.jpeg,.png')}
          </>
        )}

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, gap: 12 }}>
          {step > 0 ? (
            <button onClick={handleBack} className="onboarding-btn-secondary">
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed() || saving}
              className="onboarding-btn-primary"
              style={{
                background: canProceed() && !saving ? PRIMARY : 'rgba(0, 0, 0, 0.08)',
                cursor: canProceed() && !saving ? 'pointer' : 'not-allowed',
              }}
            >
              {saving ? 'Saving...' : 'Next'} <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={loading || !canProceed()}
              className="onboarding-btn-primary"
              style={{
                background: !loading && canProceed() ? PRIMARY : 'rgba(0, 0, 0, 0.08)',
                cursor: !loading && canProceed() ? 'pointer' : 'not-allowed',
              }}
            >
              {loading ? 'Completing...' : 'Complete Setup'}
              {!loading && <Check size={16} />}
            </button>
          )}
        </div>
      </div>

      <p style={{ marginTop: 24, fontSize: 12, color: '#AEAEB2' }}>
        Know AI ERP — Your workspace is being prepared
      </p>
    </div>
  );
}
