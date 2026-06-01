import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { X, Check, Palette, Lock } from 'lucide-react';
import { THEMES } from '../../utils/constants';

export default function SettingsModal({ onClose }) {
  const { changePassword: authChangePassword } = useAuth();
  const { theme, changeTheme } = useTheme();
  const [tab, setTab] = useState('themes');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const handleChangePassword = async () => {
    if (!oldPw || !newPw) {
      setMsg({ text: 'Please fill in all fields', type: 'error' });
      return;
    }
    if (newPw.length < 4) {
      setMsg({ text: 'New password must be at least 4 characters', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg({ text: '', type: '' });
    
    try {
      await authChangePassword(oldPw, newPw);
      setMsg({ text: 'Password successfully updated', type: 'success' });
      setOldPw('');
      setNewPw('');
    } catch (err) {
      setMsg({ text: err.message || 'Failed to change password', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)' }}>
          <button onClick={() => setTab('themes')} style={{
            flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 500,
            border: 'none', background: 'none', cursor: 'pointer',
            color: tab === 'themes' ? 'var(--c-accent)' : 'var(--c-text-sec)',
            borderBottom: tab === 'themes' ? '2px solid var(--c-accent)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Palette size={16} /> Themes
          </button>
          <button onClick={() => setTab('password')} style={{
            flex: 1, padding: '12px 0', fontSize: 14, fontWeight: 500,
            border: 'none', background: 'none', cursor: 'pointer',
            color: tab === 'password' ? 'var(--c-accent)' : 'var(--c-text-sec)',
            borderBottom: tab === 'password' ? '2px solid var(--c-accent)' : '2px solid transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Lock size={16} /> Password
          </button>
        </div>

        <div className="modal-body">
          {tab === 'themes' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {THEMES.map(t => (
                <button key={t.id} onClick={() => changeTheme(t.id)} style={{
                  padding: 16, borderRadius: 10,
                  border: `2px solid ${theme === t.id ? 'var(--c-accent)' : 'var(--c-border)'}`,
                  background: theme === t.id ? 'rgba(79,110,247,0.06)' : 'var(--c-surface2)',
                  cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    {t.colors.map((c, i) => (
                      <div key={i} style={{ width: 14, height: 14, borderRadius: 4, background: c }} />
                    ))}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{t.label}</p>
                  <p style={{ fontSize: 12, color: 'var(--c-text-sec)', marginTop: 2 }}>{t.desc}</p>
                  {theme === t.id && (
                    <div style={{
                      position: 'absolute', top: 10, right: 10,
                      width: 22, height: 22, borderRadius: '50%',
                      background: 'var(--c-accent)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={13} color="#fff" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          {tab === 'password' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">Current Password</label>
                <input className="form-input" type="password" value={oldPw} onChange={e => setOldPw(e.target.value)} placeholder="••••••••" />
              </div>
              <div>
                <label className="form-label">New Password</label>
                <input className="form-input" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="••••••••" />
              </div>
              
              {msg.text && (
                <div style={{ 
                  padding: '10px 12px', borderRadius: 8, fontSize: 13,
                  background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                  color: msg.type === 'error' ? '#ef4444' : '#22c55e',
                  border: `1px solid ${msg.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)'}`
                }}>
                  {msg.text}
                </div>
              )}

              <button 
                className="btn-primary" 
                onClick={handleChangePassword} 
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
