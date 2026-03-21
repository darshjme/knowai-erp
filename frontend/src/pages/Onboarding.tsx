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

const PRIMARY = '#7C3AED';

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

  const saveProgress = async (nextStep: number) => {
    setSaving(true);
    try {
      await onboardingApi.saveProgress?.({
        step: nextStep, dateOfBirth: form.dateOfBirth || undefined, phone: form.phone || undefined,
        bio: form.bio || undefined, department: form.department || undefined, designation: form.designation || undefined,
        skills: form.skills || undefined, linkedinUrl: form.linkedinUrl || undefined,
        secretQuestion: form.secretQuestion || undefined, secretAnswer: form.secretAnswer || undefined,
      });
    } catch {} finally { setSaving(false); }
  };

  const handleNext = async () => {
    if (step < STEPS.length - 1) { await saveProgress(step); setStep(step + 1); setError(''); }
  };

  const handleBack = () => { if (step > 0) { setStep(step - 1); setError(''); } };

  const handleComplete = async () => {
    setError(''); setLoading(true);
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
      setError(err.response?.data?.error || err.message || 'Failed to complete onboarding');
    } finally { setLoading(false); }
  };

  const inputClass = 'w-full bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg px-3 py-2.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[#7C3AED] focus:ring-2 focus:ring-[#7C3AED]/20 outline-none text-[14px]';
  const labelClass = 'block text-[13px] font-semibold text-[var(--text-secondary)] mb-1.5';

  const renderFileButton = (label: string, file: File | null, inputRef: React.RefObject<HTMLInputElement | null>, fieldKey: string, accept: string) => (
    <div className="mb-6" data-testid={`upload-${fieldKey}`}>
      <label className={labelClass}>{label}</label>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={(e) => set(fieldKey, e.target.files?.[0] || null)} />
      <div onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-[#7C3AED]/30 bg-[#7C3AED]/5' : 'border-[var(--border-default)] bg-[var(--bg-elevated)] hover:border-[var(--text-muted)]'}`}>
        {file ? (
          <div className="flex items-center justify-center gap-2">
            <FileText size={18} className="text-[#7C3AED]" />
            <span className="text-[14px] text-[var(--text-primary)]">{file.name}</span>
            <button onClick={(e) => { e.stopPropagation(); set(fieldKey, null); }} className="p-0.5 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={16} />
            </button>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-[var(--text-muted)] mb-2" />
            <p className="text-[13px] text-[var(--text-muted)]">Click to upload or drag & drop</p>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-[64px] h-[64px] bg-[#7C3AED] rounded-2xl flex items-center justify-center mx-auto mb-4 text-[24px] font-extrabold text-white">K</div>
        <h1 className="text-[28px] font-bold text-[var(--text-primary)] font-[Manrope]">Welcome to Know AI</h1>
        <p className="text-[var(--text-secondary)] text-[15px]">Complete your profile to get started</p>
      </div>

      {/* Progress Stepper */}
      <div className="flex items-center justify-center mb-6 gap-0">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? 1 : 'none' }}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${isDone || isActive ? 'bg-[#7C3AED] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                {isDone ? <Check size={16} /> : <Icon size={16} />}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 transition-colors ${i < step ? 'bg-[#7C3AED]' : 'bg-[var(--border-default)]'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Label */}
      <p className="text-center text-[14px] font-semibold text-[var(--text-secondary)] mb-4">
        Step {step + 1}: {STEPS[step].label}
        {saving && <span className="text-[12px] text-[var(--text-muted)] ml-2">Saving...</span>}
      </p>

      {/* Card */}
      <div className="w-full max-w-[520px] bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-6 shadow-lg">
        {error && <div className="bg-red-500/10 text-red-400 px-4 py-2.5 rounded-lg mb-4 text-[13px]">{error}</div>}

        {step === 0 && (
          <>
            <div className="mb-5">
              <label className={labelClass}>Date of Birth *</label>
              <input type="date" className={inputClass} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} max={new Date().toISOString().split('T')[0]} data-testid="dob" />
            </div>
            <div className="mb-5">
              <label className={labelClass}>Phone Number *</label>
              <input type="tel" className={inputClass} placeholder="+91 98765 43210" value={form.phone} onChange={(e) => set('phone', e.target.value)} data-testid="phone" />
            </div>
            <div className="mb-5">
              <label className={labelClass}>Bio</label>
              <textarea className={`${inputClass} min-h-[80px] resize-y`} placeholder="Tell us a bit about yourself..." maxLength={200} value={form.bio} onChange={(e) => set('bio', e.target.value)} data-testid="bio" />
              <span className="text-[12px] text-[var(--text-muted)] float-right mt-1">{form.bio.length}/200</span>
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <div className="mb-5">
              <label className={labelClass}>Department</label>
              <input type="text" className={inputClass} placeholder="e.g. Engineering" value={form.department} onChange={(e) => set('department', e.target.value)} />
              {user?.department && <span className="text-[12px] text-[var(--text-muted)] mt-1 block">Pre-filled from admin settings</span>}
            </div>
            <div className="mb-5">
              <label className={labelClass}>Designation</label>
              <input type="text" className={inputClass} placeholder="e.g. Senior Developer" value={form.designation} onChange={(e) => set('designation', e.target.value)} />
            </div>
            <div className="mb-5">
              <label className={labelClass}>Skills</label>
              <input type="text" className={inputClass} placeholder="React, Node.js, Python (comma-separated)" value={form.skills} onChange={(e) => set('skills', e.target.value)} />
            </div>
            <div className="mb-5">
              <label className={labelClass}>LinkedIn URL (optional)</label>
              <input type="url" className={inputClass} placeholder="https://linkedin.com/in/yourname" value={form.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mb-5">
              <label className={labelClass}>Secret Question *</label>
              <select className={inputClass} value={form.secretQuestion} onChange={(e) => set('secretQuestion', e.target.value)} data-testid="secret-question">
                {SECRET_QUESTIONS.map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
            <div className="mb-5">
              <label className={labelClass}>Secret Answer *</label>
              <input type="text" className={inputClass} placeholder="Your answer (case-sensitive)" value={form.secretAnswer} onChange={(e) => set('secretAnswer', e.target.value)} data-testid="secret-answer" />
            </div>
            <div className="mb-5 flex items-start gap-2.5">
              <input type="checkbox" id="agreeTerms" checked={form.agreeTerms} onChange={(e) => set('agreeTerms', e.target.checked)} className="mt-0.5 accent-[#7C3AED]" data-testid="agree-terms" />
              <label htmlFor="agreeTerms" className="text-[13px] text-[var(--text-primary)] cursor-pointer leading-relaxed">
                I agree to the Terms of Service and Privacy Policy of Know AI.
              </label>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {renderFileButton('Profile Photo (JPEG/PNG, max 5MB)', form.profilePhoto, photoRef, 'profilePhoto', '.jpg,.jpeg,.png,.webp')}
            {renderFileButton('Resume (PDF/DOCX, max 10MB)', form.resume, resumeRef, 'resume', '.pdf,.docx,.doc')}
            {renderFileButton('Government ID (optional)', form.govId, govIdRef, 'govId', '.pdf,.jpg,.jpeg,.png')}
          </>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 gap-3">
          {step > 0 ? (
            <button onClick={handleBack} className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1" data-testid="back-btn">
              <ChevronLeft size={16} /> Back
            </button>
          ) : <div />}

          {step < STEPS.length - 1 ? (
            <button onClick={handleNext} disabled={!canProceed() || saving}
              className={`rounded-lg px-5 py-2 text-[13px] font-semibold flex items-center gap-1 transition-colors ${canProceed() && !saving ? 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90 cursor-pointer' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'}`}
              data-testid="next-btn">
              {saving ? 'Saving...' : 'Next'} <ChevronRight size={16} />
            </button>
          ) : (
            <button onClick={handleComplete} disabled={loading || !canProceed()}
              className={`rounded-lg px-5 py-2 text-[13px] font-semibold flex items-center gap-1 transition-colors ${!loading && canProceed() ? 'bg-[#7C3AED] text-white hover:bg-[#7C3AED]/90 cursor-pointer' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] cursor-not-allowed'}`}
              data-testid="complete-btn">
              {loading ? 'Completing...' : 'Complete Setup'}
              {!loading && <Check size={16} />}
            </button>
          )}
        </div>
      </div>

      <p className="mt-6 text-[12px] text-[var(--text-muted)]">Know AI ERP -- Your workspace is being prepared</p>
    </div>
  );
}
