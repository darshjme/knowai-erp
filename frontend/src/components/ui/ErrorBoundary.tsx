import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isDev = import.meta.env.DEV;

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
          {/* Glass card container */}
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
            {/* Error icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(255, 59, 48, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                color: '#FF3B30',
                fontSize: 32,
                fontWeight: 700,
              }}
            >
              !
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
              Something went wrong
            </h1>

            <p
              style={{
                color: '#86868B',
                margin: '0 0 32px',
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              An unexpected error occurred. Please reload the page to try again.
              If the problem persists, contact your administrator.
            </p>

            <button
              onClick={this.handleReload}
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
              Reload Page
            </button>
          </div>

          {/* Error details visible in development only */}
          {isDev && this.state.error && (
            <details
              style={{
                marginTop: 24,
                maxWidth: 480,
                width: '100%',
                background: 'rgba(255, 255, 255, 0.72)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                borderRadius: 12,
                padding: 16,
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: '#FF3B30',
                  marginBottom: 8,
                  fontSize: 13,
                }}
              >
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 14,
                  color: '#86868B',
                  margin: '8px 0 0',
                  lineHeight: 1.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Menlo', monospace",
                }}
              >
                {this.state.error.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
