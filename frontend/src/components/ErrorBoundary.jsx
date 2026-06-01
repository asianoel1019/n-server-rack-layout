import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          minHeight: '100vh', background: 'var(--c-primary)', padding: 40
        }}>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(239,68,68,0.1)', color: '#ef4444',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px'
            }}>
              <AlertTriangle size={32} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--c-text)', marginBottom: 8 }}>Something went wrong</h2>
            <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginBottom: 24, lineHeight: 1.5 }}>
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              className="btn-primary"
              onClick={() => window.location.reload()}
              style={{ padding: '10px 24px' }}
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details style={{ marginTop: 16, textAlign: 'left' }}>
                <summary style={{ fontSize: 12, color: 'var(--c-text-sec)', cursor: 'pointer' }}>Error Details</summary>
                <pre style={{ fontSize: 11, color: '#ef4444', marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
