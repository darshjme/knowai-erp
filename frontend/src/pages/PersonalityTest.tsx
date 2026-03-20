import { useState, useEffect, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Spinner, Alert } from 'react-bootstrap';
import { Brain, ArrowRight, ArrowLeft, RotateCcw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';
import api from '../services/api';

const AXIS_LABELS = {
  EI: { A: 'Extraversion (E)', B: 'Introversion (I)' },
  SN: { A: 'Sensing (S)', B: 'iNtuition (N)' },
  TF: { A: 'Thinking (T)', B: 'Feeling (F)' },
  JP: { A: 'Judging (J)', B: 'Perceiving (P)' },
};

const AXIS_COLORS = {
  EI: '#3B82F6',
  SN: '#8B3FE9',
  TF: '#16A34A',
  JP: '#EA580C',
};

export default function PersonalityTest() {
  const dispatch = useDispatch();
  const { user } = useSelector((s) => s.auth);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const [testTaken, setTestTaken] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);

  // Test state
  const [started, setStarted] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [animDir, setAnimDir] = useState('right');

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Personality Test' });
    fetchTestData();
  }, [dispatch]);

  const fetchTestData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get('/personality-test');
      const d = data?.data || data;
      setQuestions(d.questions || []);
      if (d.taken) {
        setTestTaken(true);
        setResult({
          personalityType: d.personalityType,
          typeInfo: d.typeInfo,
          testDate: d.testDate,
          testData: d.testData,
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to load personality test');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnswer = (choice) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = choice;
    setAnswers(newAnswers);

    // Auto-advance after a short delay
    if (currentQ < questions.length - 1) {
      setTimeout(() => {
        setAnimDir('right');
        setCurrentQ(currentQ + 1);
      }, 300);
    }
  };

  const goNext = () => {
    if (currentQ < questions.length - 1) {
      setAnimDir('right');
      setCurrentQ(currentQ + 1);
    }
  };

  const goPrev = () => {
    if (currentQ > 0) {
      setAnimDir('left');
      setCurrentQ(currentQ - 1);
    }
  };

  const handleSubmit = async () => {
    if (answers.length !== questions.length || answers.some((a) => !a)) {
      setError('Please answer all 20 questions before submitting.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const { data } = await api.post('/personality-test', { answers });
      const d = data?.data || data;
      setResult({
        personalityType: d.personalityType,
        typeInfo: d.typeInfo,
        scores: d.scores,
        testDate: new Date().toISOString(),
      });
      setTestTaken(true);

      // Update user in local storage
      const saved = localStorage.getItem('knowai-user');
      if (saved) {
        try {
          const u = JSON.parse(saved);
          u.personalityTestTaken = true;
          u.personalityType = d.personalityType;
          localStorage.setItem('knowai-user', JSON.stringify(u));
          dispatch({ type: 'AUTH_SUCCESS', payload: u });
        } catch {}
      }
    } catch (err) {
      setError(err.message || 'Failed to submit test');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetake = () => {
    setTestTaken(false);
    setResult(null);
    setStarted(false);
    setCurrentQ(0);
    setAnswers([]);
    setError(null);
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 400 }}>
        <Spinner animation="border" style={{ color: '#111827' }} />
      </div>
    );
  }

  // ── Result Screen ─────────────────────────────────────────────────────

  if (testTaken && result) {
    const { personalityType, typeInfo, scores, testDate } = result;
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Your Personality Profile</h1>
            <p>Carl Jung / MBTI Assessment Result</p>
          </div>
          <div className="page-actions">
            <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={handleRetake}>
              <RotateCcw size={14} /> Retake Test
            </button>
          </div>
        </div>

        {/* Type Badge */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '48px 24px',
            background: 'linear-gradient(135deg, #3B82F620 0%, #8B3FE920 100%)',
            borderRadius: 16,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B3FE9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              boxShadow: '0 8px 32px rgba(59,130,246,0.3)',
            }}
          >
            <span style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: 2 }}>{personalityType}</span>
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 700, color: '#10222F', marginBottom: 8 }}>
            {typeInfo?.title || personalityType}
          </h2>
          <p style={{ fontSize: 16, color: '#5B6B76', maxWidth: 640, lineHeight: 1.7 }}>
            {typeInfo?.description || ''}
          </p>
          {testDate && (
            <p style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>
              Test taken: {new Date(testDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          )}
        </div>

        {/* Axis Scores */}
        {scores && (
          <div className="kai-card" style={{ marginBottom: 24 }}>
            <div className="kai-card-header">
              <h6>Your Axis Scores</h6>
            </div>
            <div className="kai-card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
                {Object.entries(scores).map(([axis, data]) => {
                  const labels = AXIS_LABELS[axis];
                  const total = data.scoreA + data.scoreB;
                  const pctA = total > 0 ? Math.round((data.scoreA / total) * 100) : 50;
                  const pctB = 100 - pctA;
                  const color = AXIS_COLORS[axis];
                  return (
                    <div key={axis} style={{ padding: 16, background: '#FAFAFA', borderRadius: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color }}>{labels.A}</span>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#5B6B76' }}>{labels.B}</span>
                      </div>
                      <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', background: '#E5E7EB' }}>
                        <div style={{ width: `${pctA}%`, background: color, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color }}>{pctA}%</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#5B6B76' }}>{pctB}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Strengths & Growth Areas */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          <div className="kai-card">
            <div className="kai-card-header">
              <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={18} style={{ color: '#16A34A' }} /> Strengths
              </h6>
            </div>
            <div className="kai-card-body">
              {typeInfo?.strengths?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {typeInfo.strengths.map((s, i) => (
                    <li key={i} style={{ fontSize: 14, color: '#10222F', lineHeight: 1.6 }}>{s}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No strength data available</p>
              )}
            </div>
          </div>
          <div className="kai-card">
            <div className="kai-card-header">
              <h6 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Sparkles size={18} style={{ color: '#EA580C' }} /> Growth Areas
              </h6>
            </div>
            <div className="kai-card-body">
              {typeInfo?.growthAreas?.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {typeInfo.growthAreas.map((g, i) => (
                    <li key={i} style={{ fontSize: 14, color: '#10222F', lineHeight: 1.6 }}>{g}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted">No growth area data available</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Welcome Screen ────────────────────────────────────────────────────

  if (!started) {
    return (
      <div>
        <div className="page-header">
          <div>
            <h1>Personality Assessment</h1>
            <p>Discover your Carl Jung / MBTI personality type</p>
          </div>
        </div>

        <div
          style={{
            maxWidth: 720,
            margin: '0 auto',
            textAlign: 'center',
            padding: '48px 32px',
            background: 'linear-gradient(135deg, #3B82F610 0%, #8B3FE910 100%)',
            borderRadius: 20,
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3B82F6, #8B3FE9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Brain size={40} color="#fff" />
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#10222F', marginBottom: 16 }}>
            Carl Jung Personality Assessment
          </h2>

          <p style={{ fontSize: 15, color: '#5B6B76', lineHeight: 1.8, maxWidth: 560, margin: '0 auto 24px' }}>
            This assessment is based on Carl Jung's theory of psychological types, the foundation of the
            Myers-Briggs Type Indicator (MBTI). It measures your preferences across four dimensions:
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              maxWidth: 480,
              margin: '0 auto 32px',
              textAlign: 'left',
            }}
          >
            {[
              { axis: 'E / I', label: 'Extraversion vs Introversion', desc: 'Where you focus your energy', color: '#3B82F6' },
              { axis: 'S / N', label: 'Sensing vs iNtuition', desc: 'How you take in information', color: '#8B3FE9' },
              { axis: 'T / F', label: 'Thinking vs Feeling', desc: 'How you make decisions', color: '#16A34A' },
              { axis: 'J / P', label: 'Judging vs Perceiving', desc: 'How you organize your life', color: '#EA580C' },
            ].map((item) => (
              <div
                key={item.axis}
                style={{
                  padding: '14px 16px',
                  background: '#fff',
                  borderRadius: 12,
                  borderLeft: `4px solid ${item.color}`,
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 700, color: item.color, marginBottom: 2 }}>{item.axis}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#10222F' }}>{item.label}</div>
                <div style={{ fontSize: 11, color: '#9CA3AF' }}>{item.desc}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center', marginBottom: 32 }}>
            <span style={{ fontSize: 13, color: '#5B6B76' }}>20 questions &middot; Approximately 5 minutes</span>
            <span style={{ fontSize: 12, color: '#9CA3AF' }}>There are no right or wrong answers. Choose what feels most natural to you.</span>
          </div>

          <button
            className="kai-btn kai-btn-primary"
            style={{ padding: '12px 48px', fontSize: 16, fontWeight: 600, borderRadius: 12 }}
            onClick={() => {
              setStarted(true);
              setAnswers(new Array(questions.length).fill(null));
            }}
          >
            Start Assessment <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  // ── Question Screen ───────────────────────────────────────────────────

  const q = questions[currentQ];
  const progress = ((currentQ + 1) / questions.length) * 100;
  const answeredCount = answers.filter(Boolean).length;
  const allAnswered = answeredCount === questions.length;
  const currentAxis = q?.axis;
  const axisColor = AXIS_COLORS[currentAxis] || '#3B82F6';

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Personality Assessment</h1>
          <p>Question {currentQ + 1} of {questions.length}</p>
        </div>
      </div>

      {error && (
        <Alert variant="danger" className="d-flex align-items-center gap-2 mb-3" dismissible onClose={() => setError(null)}>
          <AlertCircle size={16} /> {error}
        </Alert>
      )}

      {/* Progress Bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: axisColor }}>
            {AXIS_LABELS[currentAxis]?.A} vs {AXIS_LABELS[currentAxis]?.B}
          </span>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>{answeredCount}/{questions.length} answered</span>
        </div>
        <div style={{ height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              width: `${progress}%`,
              height: '100%',
              background: `linear-gradient(90deg, #3B82F6, ${axisColor})`,
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div
        key={currentQ}
        style={{
          maxWidth: 720,
          margin: '0 auto',
          animation: `slideIn${animDir === 'right' ? 'Right' : 'Left'} 0.3s ease`,
        }}
      >
        <div
          className="kai-card"
          style={{
            padding: 32,
            borderTop: `4px solid ${axisColor}`,
            marginBottom: 24,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, color: axisColor, marginBottom: 16 }}>
            Question {currentQ + 1}
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: '#10222F', lineHeight: 1.6, marginBottom: 28 }}>
            {q?.text}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Option A */}
            <button
              onClick={() => handleAnswer('A')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 20px',
                background: answers[currentQ] === 'A' ? `${axisColor}10` : '#FAFAFA',
                border: `2px solid ${answers[currentQ] === 'A' ? axisColor : '#E5E7EB'}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: answers[currentQ] === 'A' ? axisColor : '#E5E7EB',
                  color: answers[currentQ] === 'A' ? '#fff' : '#5B6B76',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                A
              </div>
              <span style={{ fontSize: 15, color: '#10222F', lineHeight: 1.5 }}>{q?.optionA}</span>
            </button>

            {/* Option B */}
            <button
              onClick={() => handleAnswer('B')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '18px 20px',
                background: answers[currentQ] === 'B' ? `${axisColor}10` : '#FAFAFA',
                border: `2px solid ${answers[currentQ] === 'B' ? axisColor : '#E5E7EB'}`,
                borderRadius: 12,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease',
                width: '100%',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: answers[currentQ] === 'B' ? axisColor : '#E5E7EB',
                  color: answers[currentQ] === 'B' ? '#fff' : '#5B6B76',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: 14,
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                }}
              >
                B
              </div>
              <span style={{ fontSize: 15, color: '#10222F', lineHeight: 1.5 }}>{q?.optionB}</span>
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            className="kai-btn kai-btn-outline kai-btn-sm"
            onClick={goPrev}
            disabled={currentQ === 0}
            style={{ opacity: currentQ === 0 ? 0.4 : 1 }}
          >
            <ArrowLeft size={14} /> Previous
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            {questions.map((_, i) => (
              <div
                key={i}
                onClick={() => { setAnimDir(i > currentQ ? 'right' : 'left'); setCurrentQ(i); }}
                style={{
                  width: i === currentQ ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  background: answers[i] ? axisColor : i === currentQ ? '#9CA3AF' : '#E5E7EB',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>

          {currentQ === questions.length - 1 ? (
            <button
              className="kai-btn kai-btn-primary kai-btn-sm"
              onClick={handleSubmit}
              disabled={!allAnswered || submitting}
              style={{ opacity: !allAnswered ? 0.5 : 1 }}
            >
              {submitting ? <Spinner size="sm" animation="border" /> : <><CheckCircle2 size={14} /> Submit</>}
            </button>
          ) : (
            <button className="kai-btn kai-btn-outline kai-btn-sm" onClick={goNext}>
              Next <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Inline animation styles */}
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
