import { useState, useEffect } from 'react';
import { X, Mail, Info, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function HelpModal({ onClose }) {
  const { apiFetch } = useAuth();
  const [info, setInfo] = useState({ version: '...', authorEmail: '...' });
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    apiFetch('/system/info')
      .then(r => r.json())
      .then(data => setInfo(data))
      .catch(() => {});
  }, []);

  return (
    <div className="modal-overlay animate-fade" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450, padding: 0, overflow: 'hidden' }}>
        <div style={{
          background: 'linear-gradient(135deg, #4f6ef7, #2563eb)',
          padding: '24px 32px', color: '#fff', position: 'relative'
        }}>
          <button onClick={onClose} style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.1)', border: 'none',
            color: '#fff', padding: 6, borderRadius: 6, cursor: 'pointer'
          }}>
            <X size={18} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <div style={{ padding: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 10 }}>
              <Info size={24} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>About System</h2>
          </div>
          <p style={{ fontSize: 14, opacity: 0.9 }}>Server Rack Layout Management Platform</p>
        </div>

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ color: 'var(--c-accent)', marginTop: 2 }}>
                <ShieldCheck size={20} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--c-text-sec)', marginBottom: 4 }}>Software Version</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>{info.version}</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ color: 'var(--c-accent)', marginTop: 2 }}>
                <Mail size={20} />
              </div>
              <div>
                <p style={{ fontSize: 13, color: 'var(--c-text-sec)', marginBottom: 4 }}>Support & Author</p>
                <a href={`mailto:${info.authorEmail}`} style={{
                  fontSize: 16, fontWeight: 600, color: 'var(--c-accent)',
                  textDecoration: 'none', borderBottom: '1px solid transparent',
                  transition: 'border 0.2s'
                }}
                  onMouseEnter={e => e.currentTarget.style.borderBottomColor = 'var(--c-accent)'}
                  onMouseLeave={e => e.currentTarget.style.borderBottomColor = 'transparent'}
                >
                  {info.authorEmail}
                </a>
              </div>
            </div>
          </div>

          <div style={{
            marginTop: 40, paddingTop: 20, borderTop: '1px solid var(--c-border)',
            textAlign: 'center'
          }}>
            <button className="btn-primary" onClick={onClose} style={{ padding: '10px 40px' }}>
              Close
            </button>
            <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginTop: 16 }}>
              © {currentYear} Noel Management Systems. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

