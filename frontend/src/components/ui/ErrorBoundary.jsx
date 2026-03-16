import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log to console in all environments; extend with external logging as needed
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
            background: 'var(--kai-bg, #FAFAFA)',
            color: 'var(--kai-text, #10222F)',
            padding: '2rem',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          }}
        >
          {/* Brand icon */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 'var(--kai-radius-lg, 12px)',
              background: 'var(--kai-danger, #CB3939)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.5rem',
              color: '#fff',
              fontSize: 32,
              fontWeight: 700,
            }}
          >
            !
          </div>

          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              margin: '0 0 0.5rem',
            }}
          >
            Something went wrong
          </h1>

          <p
            style={{
              color: 'var(--kai-text-secondary, #4C5963)',
              margin: '0 0 2rem',
              textAlign: 'center',
              maxWidth: 480,
              lineHeight: 1.6,
            }}
          >
            An unexpected error occurred in Know AI ERP. Please reload the page
            to try again. If the problem persists, contact your administrator.
          </p>

          <button
            onClick={this.handleReload}
            style={{
              background: 'var(--kai-primary, #146DF7)',
              color: '#fff',
              border: 'none',
              borderRadius: 'var(--kai-radius, 8px)',
              padding: '0.75rem 2rem',
              fontSize: '1rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--kai-transition, all 0.2s ease)',
            }}
          >
            Reload Page
          </button>

          {/* Error details visible in development only */}
          {isDev && this.state.error && (
            <details
              style={{
                marginTop: '2rem',
                maxWidth: 640,
                width: '100%',
                background: 'var(--kai-surface, #FFFFFF)',
                border: '1px solid var(--kai-border, #E7E7E8)',
                borderRadius: 'var(--kai-radius, 8px)',
                padding: '1rem',
                boxShadow: 'var(--kai-shadow-sm, 0 1px 3px rgba(0,0,0,0.06))',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  fontWeight: 600,
                  color: 'var(--kai-danger, #CB3939)',
                  marginBottom: '0.5rem',
                }}
              >
                Error Details (Development Only)
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: '0.8rem',
                  color: 'var(--kai-text-secondary, #4C5963)',
                  margin: '0.5rem 0 0',
                  lineHeight: 1.5,
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
