import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#F5F5F7',
        color: '#1D1D1F',
        padding: '2rem',
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}
    >
      {/* Glass card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 16,
          padding: 48,
          maxWidth: 480,
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* 404 display */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: '-2px',
            lineHeight: 1.1,
            color: '#AEAEB2',
            marginBottom: 16,
          }}
        >
          404
        </div>

        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            margin: '0 0 8px',
            letterSpacing: '-0.5px',
            lineHeight: 1.3,
            color: '#1D1D1F',
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            color: '#86868B',
            margin: '0 0 32px',
            fontSize: 15,
            lineHeight: 1.5,
          }}
        >
          The page you're looking for doesn't exist or has been moved.
        </p>

        <button
          onClick={() => navigate('/dashboard')}
          style={{
            background: '#111827',
            color: '#fff',
            border: 'none',
            borderRadius: 8,
            padding: '12px 32px',
            fontSize: 15,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
            minHeight: 44,
          }}
          onMouseOver={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#1F2937';
          }}
          onMouseOut={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = '#111827';
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}
