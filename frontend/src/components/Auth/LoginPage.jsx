import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Server, Lock, User } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#1a1f2e',
    }}>
      {/* Left branding panel */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1f2e 0%, #2d3555 100%)',
        padding: 40,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #4f6ef7, #7c3aed)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', boxShadow: '0 8px 32px rgba(79,110,247,0.4)',
          }}>
            <Server size={36} color="#fff" />
          </div>
          <h1 style={{ color: '#fff', fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Rack Manager</h1>
          <p style={{ color: '#a0a5b5', fontSize: 14, marginTop: 8 }}>Data Center Management Platform</p>
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        width: 480, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: '#fff', padding: 60,
      }}>
        <div style={{ width: '100%', maxWidth: 340 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a1f2e', marginBottom: 8 }}>Welcome back</h2>
          <p style={{ fontSize: 14, color: '#6b7280', marginBottom: 32 }}>Sign in to your account</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Username</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  style={{
                    width: '100%', padding: '12px 14px 12px 38px',
                    borderRadius: 8, border: '1px solid #e5e7eb',
                    fontSize: 14, outline: 'none', transition: 'border 0.15s',
                    background: '#f9fafb', color: '#1a1f2e',
                  }}
                  onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                  autoFocus
                />
              </div>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={{
                    width: '100%', padding: '12px 14px 12px 38px',
                    borderRadius: 8, border: '1px solid #e5e7eb',
                    fontSize: 14, outline: 'none', transition: 'border 0.15s',
                    background: '#f9fafb', color: '#1a1f2e',
                  }}
                  onFocus={e => e.target.style.borderColor = '#4f6ef7'}
                  onBlur={e => e.target.style.borderColor = '#e5e7eb'}
                />
              </div>
            </div>

            {error && (
              <div style={{
                padding: '10px 14px', borderRadius: 8, marginBottom: 16,
                background: '#fef2f2', color: '#dc2626', fontSize: 13, fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 8,
              background: '#4f6ef7', color: '#fff', fontSize: 15, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'opacity 0.15s',
              opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>


        </div>
      </div>
    </div>
  );
}
