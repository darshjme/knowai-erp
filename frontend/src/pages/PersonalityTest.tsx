import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Brain, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';

const AXIS_LABELS = {
  EI: { A: 'Extraversion (E)', B: 'Introversion (I)' },
  SN: { A: 'Sensing (S)', B: 'iNtuition (N)' },
  TF: { A: 'Thinking (T)', B: 'Feeling (F)' },
  JP: { A: 'Judging (J)', B: 'Perceiving (P)' },
};

const AXIS_COLORS = { EI: '#3B82F6', SN: '#8B3FE9', TF: '#16A34A', JP: '#EA580C' };

export default function PersonalityTest() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [testTaken, setTestTaken] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [animDir, setAnimDir] = useState('right');

  useEffect(() => { dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Personality Test' }); fetchTestData(); }, [dispatch]);

  const fetchTestData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get('/personality-test');
      const d = data?.data || data;
      setQuestions(d.questions || []);
      if (d.taken) { setTestTaken(true); setResult({ personalityType: d.personalityType, typeInfo: d.typeInfo, testDate: d.testDate, testData: d.testData }); }
    } catch (err) { setError(err.message || 'Failed to load personality test'); }
    finally { setLoading(false); }
  }, []);

  const handleAnswer = (choice) => {
    const newAnswers = [...answers]; newAnswers[currentQ] = choice; setAnswers(newAnswers);
    if (currentQ < questions.length - 1) { setTimeout(() => { setAnimDir('right'); setCurrentQ(currentQ + 1); }, 300); }
  };

  const goNext = () => { if (currentQ < questions.length - 1) { setAnimDir('right'); setCurrentQ(currentQ + 1); } };
  const goPrev = () => { if (currentQ > 0) { setAnimDir('left'); setCurrentQ(currentQ - 1); } };

  const handleSubmit = async () => {
    if (answers.length !== questions.length || answers.some((a) => !a)) { setError('Please answer all 20 questions before submitting.'); return; }
    setSubmitting(true); setError(null);
    try {
      const { data } = await api.post('/personality-test', { answers });
      const d = data?.data || data;
      setResult({ personalityType: d.personalityType, typeInfo: d.typeInfo, scores: d.scores, testDate: new Date().toISOString() });
      setTestTaken(true);
      const saved = localStorage.getItem('knowai-user');
      if (saved) { try { const u = JSON.parse(saved); u.personalityTestTaken = true; u.personalityType = d.personalityType; localStorage.setItem('knowai-user', JSON.stringify(u)); dispatch({ type: 'AUTH_SUCCESS', payload: u }); } catch {} }
    } catch (err) { setError(err.message || 'Failed to submit test'); }
    finally { setSubmitting(false); }
  };

  const handleRetake = () => { setTestTaken(false); setResult(null); setStarted(false); setCurrentQ(0); setAnswers([]); setError(null); };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Result Screen
  if (testTaken && result) {
    const { personalityType, typeInfo, scores, testDate } = result;
    return (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Your Personality Profile</h1>
            <p className="text-[13px] text-[var(--text-secondary)]">Carl Jung / MBTI Assessment Result</p>
          </div>
          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1" onClick={handleRetake} data-testid="retake-test">
            <RotateCcw size={14} /> Retake Test
          </button>
        </div>

        {/* Type Badge */}
        <div className="flex flex-col items-center py-12 px-6 rounded-2xl mb-6 text-center" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.12) 0%, rgba(139,63,233,0.12) 100%)' }}>
          <div className="w-[120px] h-[120px] rounded-full flex items-center justify-center mb-6" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B3FE9)', boxShadow: '0 8px 32px rgba(59,130,246,0.3)' }}>
            <span className="text-[36px] font-extrabold text-white tracking-widest">{personalityType}</span>
          </div>
          <h2 className="text-[28px] font-bold text-[var(--text-primary)] mb-2">{typeInfo?.title || personalityType}</h2>
          <p className="text-[16px] text-[var(--text-secondary)] max-w-[640px] leading-relaxed">{typeInfo?.description || ''}</p>
          {testDate && <p className="text-[12px] text-[var(--text-muted)] mt-3">Test taken: {new Date(testDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>}
        </div>

        {/* Axis Scores */}
        {scores && (
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mb-6 overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)]"><h6 className="text-[14px] font-semibold text-[var(--text-primary)]">Your Axis Scores</h6></div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {Object.entries(scores).map(([axis, data]) => {
                  const labels = AXIS_LABELS[axis];
                  const total = data.scoreA + data.scoreB;
                  const pctA = total > 0 ? Math.round((data.scoreA / total) * 100) : 50;
                  const pctB = 100 - pctA;
                  const color = AXIS_COLORS[axis];
                  return (
                    <div key={axis} className="p-4 bg-[var(--bg-elevated)] rounded-xl">
                      <div className="flex justify-between mb-2">
                        <span className="text-[13px] font-semibold" style={{ color }}>{labels.A}</span>
                        <span className="text-[13px] font-semibold text-[var(--text-muted)]">{labels.B}</span>
                      </div>
                      <div className="flex h-2.5 rounded-full overflow-hidden bg-[var(--border-default)]">
                        <div className="transition-all duration-500" style={{ width: `${pctA}%`, background: color }} />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[12px] font-bold" style={{ color }}>{pctA}%</span>
                        <span className="text-[12px] font-bold text-[var(--text-muted)]">{pctB}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Strengths & Growth */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)]"><h6 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2"><CheckCircle2 size={18} className="text-green-400" /> Strengths</h6></div>
            <div className="p-4">
              {typeInfo?.strengths?.length > 0 ? (
                <ul className="list-disc pl-5 flex flex-col gap-2.5">{typeInfo.strengths.map((s, i) => <li key={i} className="text-[14px] text-[var(--text-primary)] leading-relaxed">{s}</li>)}</ul>
              ) : <p className="text-[var(--text-muted)]">No strength data available</p>}
            </div>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border-default)]"><h6 className="text-[14px] font-semibold text-[var(--text-primary)] flex items-center gap-2"><Sparkles size={18} className="text-orange-400" /> Growth Areas</h6></div>
            <div className="p-4">
              {typeInfo?.growthAreas?.length > 0 ? (
                <ul className="list-disc pl-5 flex flex-col gap-2.5">{typeInfo.growthAreas.map((g, i) => <li key={i} className="text-[14px] text-[var(--text-primary)] leading-relaxed">{g}</li>)}</ul>
              ) : <p className="text-[var(--text-muted)]">No growth area data available</p>}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Welcome Screen
  if (!started) {
    return (
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Personality Assessment</h1>
            <p className="text-[13px] text-[var(--text-secondary)]">Discover your Carl Jung / MBTI personality type</p>
          </div>
        </div>

        <div className="max-w-[720px] mx-auto text-center py-12 px-8 rounded-2xl" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.06) 0%, rgba(139,63,233,0.06) 100%)' }}>
          <div className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #3B82F6, #8B3FE9)' }}>
            <Brain size={40} color="#fff" />
          </div>
          <h2 className="text-[24px] font-bold text-[var(--text-primary)] mb-4">Carl Jung Personality Assessment</h2>
          <p className="text-[15px] text-[var(--text-secondary)] leading-relaxed max-w-[560px] mx-auto mb-6">
            This assessment is based on Carl Jung's theory of psychological types, the foundation of the Myers-Briggs Type Indicator (MBTI). It measures your preferences across four dimensions:
          </p>
          <div className="grid grid-cols-2 gap-4 max-w-[480px] mx-auto mb-8 text-left">
            {[
              { axis: 'E / I', label: 'Extraversion vs Introversion', desc: 'Where you focus your energy', color: '#3B82F6' },
              { axis: 'S / N', label: 'Sensing vs iNtuition', desc: 'How you take in information', color: '#8B3FE9' },
              { axis: 'T / F', label: 'Thinking vs Feeling', desc: 'How you make decisions', color: '#16A34A' },
              { axis: 'J / P', label: 'Judging vs Perceiving', desc: 'How you organize your life', color: '#EA580C' },
            ].map((item) => (
              <div key={item.axis} className="p-3.5 bg-[var(--bg-card)] rounded-xl border-l-4" style={{ borderLeftColor: item.color }}>
                <div className="text-[14px] font-bold mb-0.5" style={{ color: item.color }}>{item.axis}</div>
                <div className="text-[13px] font-semibold text-[var(--text-primary)]">{item.label}</div>
                <div className="text-[11px] text-[var(--text-muted)]">{item.desc}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2 items-center mb-8">
            <span className="text-[13px] text-[var(--text-secondary)]">20 questions &middot; Approximately 5 minutes</span>
            <span className="text-[12px] text-[var(--text-muted)]">There are no right or wrong answers. Choose what feels most natural to you.</span>
          </div>
          <button className="bg-[#7C3AED] text-white rounded-xl px-12 py-3 text-[16px] font-semibold hover:bg-[#7C3AED]/90 transition-colors inline-flex items-center gap-2"
            onClick={() => { setStarted(true); setAnswers(new Array(questions.length).fill(null)); }} data-testid="start-assessment">
            Start Assessment <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // Question Screen
  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const answeredCount = answers.filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;
  const currentAxis = q?.axis;
  const axisColor = AXIS_COLORS[currentAxis] || '#3B82F6';

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[18px] font-semibold text-[var(--text-primary)] font-[Manrope]">Personality Assessment</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Question {currentQ + 1} of {questions.length}</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 text-red-400 px-4 py-3 rounded-lg mb-4 text-[13px] flex items-center gap-2" data-testid="error-alert">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-300">&times;</button>
        </div>
      )}

      {/* Progress */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className="text-[12px] font-semibold" style={{ color: axisColor }}>{AXIS_LABELS[currentAxis]?.A} vs {AXIS_LABELS[currentAxis]?.B}</span>
          <span className="text-[12px] text-[var(--text-muted)]">{answeredCount}/{questions.length} answered</span>
        </div>
        <div className="h-1.5 bg-[var(--border-default)] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress}%`, background: `linear-gradient(90deg, #3B82F6, ${axisColor})` }} />
        </div>
      </div>

      {/* Question Card */}
      <div key={currentQ} className="max-w-[720px] mx-auto" style={{ animation: `slideIn${animDir === 'right' ? 'Right' : 'Left'} 0.3s ease` }}>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8 mb-6" style={{ borderTop: `4px solid ${axisColor}` }}>
          <div className="text-[13px] font-semibold mb-4" style={{ color: axisColor }}>Question {currentQ + 1}</div>
          <h3 className="text-[20px] font-semibold text-[var(--text-primary)] leading-relaxed mb-7">{q?.text}</h3>
          <div className="flex flex-col gap-3.5">
            {['A', 'B'].map(opt => (
              <button key={opt} onClick={() => handleAnswer(opt)} data-testid={`option-${opt}`}
                className={`flex items-center gap-4 py-4 px-5 rounded-xl cursor-pointer text-left w-full transition-all duration-200 border-2 ${answers[currentQ] === opt ? 'border-current' : 'border-[var(--border-default)]'}`}
                style={{ background: answers[currentQ] === opt ? `${axisColor}10` : 'var(--bg-elevated)', borderColor: answers[currentQ] === opt ? axisColor : undefined }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-[14px] shrink-0 transition-all"
                  style={{ background: answers[currentQ] === opt ? axisColor : 'var(--border-default)', color: answers[currentQ] === opt ? '#fff' : 'var(--text-muted)' }}>
                  {opt}
                </div>
                <span className="text-[15px] text-[var(--text-primary)] leading-snug">{opt === 'A' ? q?.optionA : q?.optionB}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1 disabled:opacity-40"
            onClick={goPrev} disabled={currentQ === 0} data-testid="prev-btn">
            <ArrowLeft size={14} /> Previous
          </button>

          <div className="flex gap-1">
            {questions.map((_, i) => (
              <div key={i} onClick={() => { setAnimDir(i > currentQ ? 'right' : 'left'); setCurrentQ(i); }}
                className="rounded-full cursor-pointer transition-all"
                style={{ width: i === currentQ ? 24 : 8, height: 8, background: answers[i] ? axisColor : i === currentQ ? 'var(--text-muted)' : 'var(--border-default)' }} />
            ))}
          </div>

          {currentQ === questions.length - 1 ? (
            <button className="bg-[#7C3AED] text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[#7C3AED]/90 transition-colors flex items-center gap-1 disabled:opacity-50"
              onClick={handleSubmit} disabled={!allAnswered || submitting} data-testid="submit-test">
              {submitting ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><CheckCircle2 size={14} /> Submit</>}
            </button>
          ) : (
            <button className="bg-transparent border border-[var(--border-default)] text-[var(--text-secondary)] rounded-lg px-3 py-1.5 text-[12px] font-semibold hover:bg-[var(--bg-elevated)] transition-colors flex items-center gap-1"
              onClick={goNext} data-testid="next-btn">
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideInRight { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
