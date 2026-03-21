import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] p-8">
      {/* Glass card */}
      <div className="bg-[var(--bg-card)] backdrop-blur-xl border border-[var(--border-default)] rounded-2xl p-12 max-w-[480px] w-full text-center shadow-lg">
        {/* 404 display */}
        <div className="text-[64px] font-bold tracking-[-2px] leading-none text-[var(--text-muted)] mb-4">
          404
        </div>

        <h1 className="text-[28px] font-bold mb-2 tracking-[-0.5px] leading-tight text-[var(--text-primary)]">
          Page not found
        </h1>

        <p className="text-[var(--text-muted)] mb-8 text-[15px] leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          data-testid="go-to-dashboard"
          onClick={() => navigate('/dashboard')}
          className="bg-[#7C3AED] text-white rounded-lg px-8 py-3 text-[15px] font-semibold hover:bg-[#7C3AED]/90 transition-colors min-h-[44px] cursor-pointer border-none"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
