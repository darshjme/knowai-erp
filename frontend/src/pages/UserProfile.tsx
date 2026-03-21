import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { teamApi, chatApi } from '../services/api';
import { Mail, Phone, MapPin, Calendar, Briefcase, Award, Globe, Linkedin, Target, Clock, Star, FileText, MessageCircle, Brain } from 'lucide-react';
import { ROLE_LABELS, ROLE_COLORS } from '../utils/roleConfig';
import VerifiedBadge from '../components/ui/VerifiedBadge';

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
  const navigate = useNavigate();
  const { user: currentUser } = useSelector(s => s.auth);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startingChat, setStartingChat] = useState(false);

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
      if (isOwnProfile && currentUser) setProfile(currentUser);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async () => {
    try {
      setStartingChat(true);
      const res = await chatApi.createRoom({ type: 'dm', memberIds: [userId] });
      const room = res.data?.data || res.data;
      navigate(`/chat?room=${room.id}`);
    } catch {
      navigate('/chat');
    } finally {
      setStartingChat(false);
    }
  };

  if (loading) return <div className="flex justify-center p-16"><div className="animate-spin w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full" /></div>;
  if (!profile) return <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-10 text-center text-[var(--text-secondary)]">User not found</div>;

  const roleLabel = ROLE_LABELS[profile.role] || profile.role;
  const roleColor = ROLE_COLORS[profile.role] || '#6B7280';
  const skills = (() => { try { return JSON.parse(profile.skills || '[]'); } catch { return []; } })();
  const personality = PERSONALITY_DESCRIPTIONS[profile.personalityType];
  const joinDate = profile.joinDate ? new Date(profile.joinDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';

  return (
    <div className="max-w-[900px] mx-auto" data-testid="user-profile">
      {/* Cover + Avatar */}
      <div className="relative rounded-xl overflow-hidden mb-6">
        <div className="h-[180px] relative" style={{ background: `linear-gradient(135deg, ${roleColor}22 0%, #11182720 50%, ${roleColor}15 100%)` }}>
          <div className="absolute inset-0 bg-gradient-to-br from-[#05121B08] to-[#11182710]" />
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl mx-6 -mt-[60px] p-6 relative">
          <div className="flex gap-5 items-end flex-wrap">
            <div className="w-[100px] h-[100px] rounded-full flex items-center justify-center text-[36px] font-extrabold text-white border-4 border-[var(--bg-card)] -mt-10 shrink-0 overflow-hidden" style={{ background: roleColor }}>
              {profile.avatar ? <img src={profile.avatar} alt="" className="w-full h-full rounded-full object-cover" /> : `${profile.firstName?.[0]}${profile.lastName?.[0]}`}
            </div>
            <div className="flex-1">
              <h2 className="m-0 text-[26px] font-extrabold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
                {profile.firstName} {profile.lastName}
                <VerifiedBadge verified={profile?.verified} />
              </h2>
              <p className="mt-1 text-[15px] text-[var(--text-secondary)]">
                {profile.designation || roleLabel}
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="px-3 py-0.5 rounded-full text-[12px] font-bold" style={{ background: `${roleColor}18`, color: roleColor }}>
                  {roleLabel}
                </span>
                {profile.department && (
                  <span className="bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-3 py-0.5 rounded-full text-[12px] font-semibold">
                    {profile.department}
                  </span>
                )}
                {profile.personalityType && (
                  <span className="bg-violet-100 text-[#7C3AED] px-3 py-0.5 rounded-full text-[12px] font-bold inline-flex items-center gap-1">
                    <Brain size={12} />
                    {profile.personalityType}
                  </span>
                )}
                <span className={`px-3 py-0.5 rounded-full text-[12px] font-semibold ${profile.status === 'ONLINE' ? 'bg-green-50 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                  {profile.status === 'ONLINE' ? '● Online' : '○ Offline'}
                </span>
              </div>
            </div>
            {!isOwnProfile && (
              <div className="flex gap-2">
                <button data-testid="message-user" className="bg-[#7C3AED] text-white rounded-lg px-4 py-2 text-[13px] font-semibold hover:bg-[#7C3AED]/90 inline-flex items-center gap-1.5" onClick={handleStartChat} disabled={startingChat}>
                  <MessageCircle size={14} /> {startingChat ? 'Opening...' : 'Message'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-5 flex-wrap">
        {/* Left Column */}
        <div className="flex-none w-[280px] flex flex-col gap-4">
          {/* Contact Info */}
          <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
            <h6 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-4">Contact</h6>
            {profile.companyEmail && (
              <div className="flex items-center gap-2.5 mb-3 text-[13px]">
                <Mail size={16} className="text-[#7C3AED] shrink-0" />
                <span className="text-[var(--text-primary)]">{profile.companyEmail}</span>
              </div>
            )}
            {profile.email && (
              <div className="flex items-center gap-2.5 mb-3 text-[13px]">
                <Mail size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text-secondary)]">{profile.email}</span>
              </div>
            )}
            {profile.phone && (
              <div className="flex items-center gap-2.5 mb-3 text-[13px]">
                <Phone size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text-secondary)]">{profile.phone}</span>
              </div>
            )}
            {joinDate && (
              <div className="flex items-center gap-2.5 mb-3 text-[13px]">
                <Calendar size={16} className="text-[var(--text-muted)] shrink-0" />
                <span className="text-[var(--text-secondary)]">Joined {joinDate}</span>
              </div>
            )}
            {profile.linkedinUrl && (
              <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2.5 text-[13px] text-[#0077B5]">
                <Linkedin size={16} className="shrink-0" />
                LinkedIn Profile
              </a>
            )}
          </div>

          {/* Skills */}
          {skills.length > 0 && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <h6 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">Skills</h6>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <span key={i} className="bg-[var(--bg-elevated)] text-[var(--text-primary)] px-3 py-1 rounded-full text-[12px] font-semibold border border-[var(--border-default)]">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">
          {/* Bio */}
          {profile.bio && (
            <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-5">
              <h6 className="text-[13px] font-bold text-[var(--text-muted)] uppercase tracking-wide mb-3">About</h6>
              <p className="text-[14px] leading-relaxed text-[var(--text-primary)] m-0 whitespace-pre-wrap">{profile.bio}</p>
            </div>
          )}

          {/* Personality Type */}
          {personality && (
            <div className="bg-gradient-to-br from-violet-100 to-violet-50 border border-violet-200 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#7C3AED] flex items-center justify-center">
                  <Brain size={24} color="#fff" />
                </div>
                <div>
                  <div className="text-[22px] font-extrabold text-violet-800 tracking-widest">{profile.personalityType}</div>
                  <div className="text-[14px] font-semibold text-[#7C3AED]">{personality.title}</div>
                </div>
              </div>
              <p className="text-[14px] text-violet-900 leading-relaxed m-0">{personality.desc}</p>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3">
            {profile.taskCompletionRate != null && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center p-4">
                <Target size={20} className="text-[#7C3AED] mx-auto mb-1.5" />
                <div className="text-[22px] font-bold text-[var(--text-primary)]">{Math.round(profile.taskCompletionRate)}%</div>
                <div className="text-[11px] text-[var(--text-muted)]">Task Completion</div>
              </div>
            )}
            {profile.attendanceRate != null && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center p-4">
                <Clock size={20} className="text-green-600 mx-auto mb-1.5" />
                <div className="text-[22px] font-bold text-[var(--text-primary)]">{Math.round(profile.attendanceRate)}%</div>
                <div className="text-[11px] text-[var(--text-muted)]">Attendance</div>
              </div>
            )}
            {profile.behaviorScore != null && (
              <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl text-center p-4">
                <Star size={20} className="text-amber-500 mx-auto mb-1.5" />
                <div className="text-[22px] font-bold text-[var(--text-primary)]">{Math.round(profile.behaviorScore)}</div>
                <div className="text-[11px] text-[var(--text-muted)]">Behavior Score</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
