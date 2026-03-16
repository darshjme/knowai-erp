import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { teamApi } from '../services/api';
import { Mail, Phone, MapPin, Calendar, Briefcase, Award, Globe, Linkedin, Target, Clock, Star, FileText, MessageCircle, Brain } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '../utils/roleConfig';

const PERSONALITY_DESCRIPTIONS = {
  INTJ: { title: 'The Architect', desc: 'Strategic, independent, determined. Excels at long-range planning and system design.' },
  INTP: { title: 'The Logician', desc: 'Analytical, objective, reserved. Loves solving complex problems with innovative approaches.' },
  ENTJ: { title: 'The Commander', desc: 'Bold, imaginative, strong-willed. Natural leader who drives projects to completion.' },
  ENTP: { title: 'The Debater', desc: 'Quick-witted, creative, entrepreneurial. Thrives on intellectual challenges.' },
  INFJ: { title: 'The Advocate', desc: 'Insightful, principled, compassionate. Driven by a deep sense of purpose.' },
  INFP: { title: 'The Mediator', desc: 'Idealistic, empathetic, creative. Seeks harmony and authentic self-expression.' },
  ENFJ: { title: 'The Protagonist', desc: 'Charismatic, empathetic, organized. Natural at inspiring and leading teams.' },
  ENFP: { title: 'The Campaigner', desc: 'Enthusiastic, creative, sociable. Brings energy and innovation to every project.' },
  ISTJ: { title: 'The Logistician', desc: 'Practical, dependable, thorough. The backbone of reliable operations.' },
  ISFJ: { title: 'The Defender', desc: 'Supportive, reliable, patient. Dedicated to protecting and helping colleagues.' },
  ESTJ: { title: 'The Executive', desc: 'Organized, logical, assertive. Excellent at managing people and processes.' },
  ESFJ: { title: 'The Consul', desc: 'Caring, sociable, traditional. Creates harmony and ensures team wellbeing.' },
  ISTP: { title: 'The Virtuoso', desc: 'Practical, observant, analytical. Master of tools and troubleshooting.' },
  ISFP: { title: 'The Adventurer', desc: 'Flexible, charming, artistic. Brings creativity and aesthetics to work.' },
  ESTP: { title: 'The Entrepreneur', desc: 'Energetic, perceptive, direct. Thrives in fast-paced environments.' },
  ESFP: { title: 'The Entertainer', desc: 'Spontaneous, energetic, enthusiastic. Makes work fun and engaging.' },
};

export default function UserProfile() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(s => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const userId = id || currentUser?.id;
  const isOwnProfile = !id || id === currentUser?.id;

  useEffect(() => {
    dispatch({ type: 'UI_SET_PAGE_TITLE', payload: 'Profile' });
    fetchProfile();
  }, [userId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await teamApi.get(userId);
      const data = res.data;
      setProfile(data);
      if (data?.firstName) {
        dispatch({ type: 'UI_SET_PAGE_TITLE', payload: `${data.firstName} ${data.lastName}` });
      }
    } catch {
      // Fallback to current user data
      if (isOwnProfile && currentUser) setProfile(currentUser);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><div className="spinner-border text-primary" /></div>;
  if (!profile) return <div className="kai-card"><div className="kai-card-body" style={{ textAlign: 'center', padding: 40 }}>User not found</div></div>;

  const roleLabel = ROLE_LABELS[profile.role] || profile.role;
  const roleColor = ROLE_COLORS[profile.role] || '#6B7280';
  const skills = (() => { try { return JSON.parse(profile.skills || '[]'); } catch { return []; } })();
  const personality = PERSONALITY_DESCRIPTIONS[profile.personalityType];
  const joinDate = profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Cover + Avatar */}
      <div style={{ position: 'relative', borderRadius: 'var(--kai-radius-lg)', overflow: 'hidden', marginBottom: 24 }}>
        <div style={{ height: 180, background: `linear-gradient(135deg, ${roleColor}22 0%, #146DF720 50%, ${roleColor}15 100%)`, position: 'relative' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #05121B08 0%, #146DF710 100%)' }} />
        </div>
        <div className="kai-card" style={{ margin: '-60px 24px 0', padding: 24, position: 'relative' }}>
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{
              width: 100, height: 100, borderRadius: '50%', background: roleColor,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 36, fontWeight: 800, color: '#fff', border: '4px solid var(--kai-surface)',
              marginTop: -40, flexShrink: 0,
            }}>
              {profile.avatar ? <img src={profile.avatar} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : `${profile.firstName?.[0]}${profile.lastName?.[0]}`}
            </div>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, color: 'var(--kai-text)', letterSpacing: -0.5 }}>
                {profile.firstName} {profile.lastName}
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: 15, color: 'var(--kai-text-secondary)' }}>
                {profile.designation || roleLabel}
              </p>
              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ background: `${roleColor}18`, color: roleColor, padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                  {roleLabel}
                </span>
                {profile.department && (
                  <span style={{ background: 'var(--kai-bg)', color: 'var(--kai-text-secondary)', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                    {profile.department}
                  </span>
                )}
                {profile.personalityType && (
                  <span style={{ background: '#EDE9FE', color: '#7C3AED', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    <Brain size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                    {profile.personalityType}
                  </span>
                )}
                <span style={{ background: profile.status === 'ONLINE' ? '#DCFCE7' : '#F3F4F6', color: profile.status === 'ONLINE' ? '#166534' : '#6B7280', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {profile.status === 'ONLINE' ? '● Online' : '○ Offline'}
                </span>
              </div>
            </div>
            {!isOwnProfile && (
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="kai-btn kai-btn-primary kai-btn-sm" onClick={() => window.location.href = '/chat'}>
                  <MessageCircle size={14} /> Message
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
        {/* Left Column */}
        <div style={{ flex: '0 0 280px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Contact Info */}
          <div className="kai-card">
            <div className="kai-card-body" style={{ padding: 20 }}>
              <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>Contact</h6>
              {profile.companyEmail && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
                  <Mail size={16} style={{ color: 'var(--kai-primary)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--kai-text)' }}>{profile.companyEmail}</span>
                </div>
              )}
              {profile.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
                  <Mail size={16} style={{ color: 'var(--kai-text-muted)', flexShrink: 0 }} />
                  <span style={{ color: 'var(--kai-text-secondary)' }}>{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
                  <Phone size={16} style={{ color: 'var(--kai-text-muted)', flexShrink: 0 }} />
                  <span>{profile.phone}</span>
                </div>
              )}
              {joinDate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontSize: 13 }}>
                  <Calendar size={16} style={{ color: 'var(--kai-text-muted)', flexShrink: 0 }} />
                  <span>Joined {joinDate}</span>
                </div>
              )}
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#0077B5' }}>
                  <Linkedin size={16} style={{ flexShrink: 0 }} />
                  LinkedIn Profile
                </a>
              )}
            </div>
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="kai-card">
              <div className="kai-card-body" style={{ padding: 20 }}>
                <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>Skills</h6>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {skills.map((skill, i) => (
                    <span key={i} style={{ background: 'var(--kai-bg)', color: 'var(--kai-text)', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1px solid var(--kai-border)' }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Bio */}
          {profile.bio && (
            <div className="kai-card">
              <div className="kai-card-body" style={{ padding: 20 }}>
                <h6 style={{ fontSize: 13, fontWeight: 700, color: 'var(--kai-text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>About</h6>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--kai-text)', margin: 0, whiteSpace: 'pre-wrap' }}>{profile.bio}</p>
              </div>
            </div>
          )}

          {/* Personality Type */}
          {personality && (
            <div className="kai-card" style={{ background: 'linear-gradient(135deg, #EDE9FE 0%, #F5F3FF 100%)', border: '1px solid #DDD6FE' }}>
              <div className="kai-card-body" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Brain size={24} color="#fff" />
                  </div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#5B21B6', letterSpacing: 2 }}>{profile.personalityType}</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#7C3AED' }}>{personality.title}</div>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: '#4C1D95', lineHeight: 1.6, margin: 0 }}>{personality.desc}</p>
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12 }}>
            {profile.taskCompletionRate != null && (
              <div className="kai-card" style={{ textAlign: 'center' }}>
                <div className="kai-card-body" style={{ padding: 16 }}>
                  <Target size={20} style={{ color: 'var(--kai-primary)', marginBottom: 6 }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(profile.taskCompletionRate)}%</div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Task Completion</div>
                </div>
              </div>
            )}
            {profile.attendanceRate != null && (
              <div className="kai-card" style={{ textAlign: 'center' }}>
                <div className="kai-card-body" style={{ padding: 16 }}>
                  <Clock size={20} style={{ color: '#16A34A', marginBottom: 6 }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(profile.attendanceRate)}%</div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Attendance</div>
                </div>
              </div>
            )}
            {profile.behaviorScore != null && (
              <div className="kai-card" style={{ textAlign: 'center' }}>
                <div className="kai-card-body" style={{ padding: 16 }}>
                  <Star size={20} style={{ color: '#F59E0B', marginBottom: 6 }} />
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{Math.round(profile.behaviorScore)}</div>
                  <div style={{ fontSize: 11, color: 'var(--kai-text-muted)' }}>Behavior Score</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
