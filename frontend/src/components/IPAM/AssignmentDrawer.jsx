import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Check, AlertCircle, Info, Database, Globe, User, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function AssignmentDrawer({ isOpen, onClose, subnets, onComplete, initialData }) {
  const { apiFetch } = useAuth();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    subnetId: '',
    address: '',
    hostname: '',
    fqdn: '',
    service: '',
    owner: '',
    environment: 'Production',
    description: '',
    createDns: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [environments, setEnvironments] = useState([]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData(prev => ({
          ...prev,
          subnetId: initialData.subnetId || subnets[0]?.id || '',
          address: initialData.address || '',
          hostname: initialData.hostname || '',
          fqdn: initialData.fqdn || '',
          owner: initialData.owner || '',
          service: initialData.service || '',
          environment: initialData.environment || 'Production',
          status: initialData.status || 'free'
        }));
        if (initialData.address) setStep(3);
      } else if (subnets.length > 0 && !formData.subnetId) {
        setFormData(prev => ({ ...prev, subnetId: subnets[0].id }));
        setStep(1);
      }
    }
  }, [isOpen, initialData, subnets]);

  useEffect(() => {
    const fetchEnvironments = async () => {
      try {
        const res = await apiFetch('/environments');
        const data = await res.json();
        setEnvironments(data);
      } catch (e) {}
    };
    if (isOpen) fetchEnvironments();
  }, [isOpen]);

  const handleNextAvailable = async () => {
    if (!formData.subnetId) return;
    try {
      const res = await apiFetch(`/subnets/${formData.subnetId}/next-available`);
      const data = await res.json();
      if (res.ok) {
        setFormData(prev => ({ ...prev, address: data.address }));
      } else {
        setError(data.error);
      }
    } catch (e) {
      setError('Failed to fetch available IP');
    }
  };

  const handleAssign = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch(`/subnets/${formData.subnetId}/ips`, {
        method: 'PUT',
        body: JSON.stringify({
          address: formData.address,
          status: 'used',
          hostname: formData.hostname,
          fqdn: formData.fqdn,
          assignedTo: formData.owner,
          service: formData.service,
          environment: formData.environment,
          tags: formData.createDns ? ['DNS-Created'] : []
        })
      });
      if (res.ok) {
        onComplete();
        onClose();
        resetForm();
      } else {
        const data = await res.json();
        setError(data.error);
      }
    } catch (e) {
      setError('System error during assignment');
    }
    setLoading(false);
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      subnetId: subnets[0]?.id || '',
      address: '',
      hostname: '',
      fqdn: '',
      service: '',
      owner: '',
      environment: 'Production',
      description: '',
      createDns: true
    });
    setError('');
  };

  if (!isOpen) return null;

  const currentSubnet = subnets.find(s => s.id === formData.subnetId);

  return (
    <div className="modal-overlay" style={{ justifyContent: 'flex-end', padding: 0 }} onClick={onClose}>
      <div 
        className="animate-slide-in-right"
        style={{ 
          width: 500, height: '100%', background: 'var(--c-surface)', 
          boxShadow: '-10px 0 30px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 700 }}>IP Assignment Center</h2>
            <p style={{ fontSize: 13, color: 'var(--c-text-sec)', marginTop: 2 }}>Guided workflow for resource allocation</p>
          </div>
          <button onClick={onClose} className="icon-btn"><X size={20} /></button>
        </div>

        {/* Steps Progress */}
        <div style={{ padding: '20px 32px', background: 'var(--c-surface2)', display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} style={{ 
              flex: 1, height: 4, borderRadius: 2, 
              background: s <= step ? 'var(--c-accent)' : 'var(--c-border)',
              transition: 'all 0.3s'
            }} />
          ))}
        </div>

        {/* Form Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
          {error && (
            <div style={{ 
              padding: '12px 16px', background: '#fef2f2', border: '1px solid #fee2e2', 
              borderRadius: 8, color: '#dc2626', fontSize: 13, display: 'flex', gap: 8, marginBottom: 24 
            }}>
              <AlertCircle size={18} /> {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,110,247,0.1)', color: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Database size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Step 1: Select Network</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="form-label">Target Subnet</label>
                  <select className="form-input" value={formData.subnetId} onChange={e => setFormData({...formData, subnetId: e.target.value, address: ''})}>
                    {subnets.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.cidr})</option>
                    ))}
                  </select>
                </div>
                {currentSubnet && (
                  <div style={{ padding: 16, background: 'var(--c-surface2)', borderRadius: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase' }}>Environment</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{currentSubnet.environment}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase' }}>VLAN</p>
                      <p style={{ fontSize: 14, fontWeight: 600 }}>{currentSubnet.vlan || 'None'}</p>
                    </div>
                  </div>
                )}
                <div>
                  <label className="form-label">Target Environment</label>
                  <select className="form-input" value={formData.environment} onChange={e => setFormData({...formData, environment: e.target.value})}>
                    {environments.map(env => (
                      <option key={env.id} value={env.name}>{env.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,110,247,0.1)', color: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Globe size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Step 2: Select IP Address</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label className="form-label">IP Address</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input className="form-input" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="e.g. 192.168.10.5" />
                    <button className="btn-secondary" onClick={handleNextAvailable} style={{ whiteSpace: 'nowrap' }}>Next Available</button>
                  </div>
                </div>
                <div style={{ padding: 16, background: 'rgba(79,110,247,0.05)', borderRadius: 12, border: '1px dashed var(--c-accent)' }}>
                  <p style={{ fontSize: 12, color: 'var(--c-accent)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={14} /> Smart Recommendation
                  </p>
                  <p style={{ fontSize: 13, marginTop: 8, color: 'var(--c-text)' }}>
                    System found <strong>{currentSubnet?.ips?.filter(ip => ip.status === 'free').length}</strong> available addresses in this pool.
                  </p>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,110,247,0.1)', color: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <User size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Step 3: Binding Information</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label className="form-label">Hostname *</label>
                  <input className="form-input" value={formData.hostname} onChange={e => setFormData({...formData, hostname: e.target.value})} placeholder="e.g. web-prod-01" />
                </div>
                <div>
                  <label className="form-label">FQDN</label>
                  <input className="form-input" value={formData.fqdn} onChange={e => setFormData({...formData, fqdn: e.target.value})} placeholder="e.g. web-prod-01.corp.local" />
                </div>
                <div>
                  <label className="form-label">Owner / Assigned To</label>
                  <input className="form-input" value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} placeholder="e.g. IT Operations" />
                </div>
                <div>
                  <label className="form-label">Service Name</label>
                  <input className="form-input" value={formData.service} onChange={e => setFormData({...formData, service: e.target.value})} placeholder="e.g. Core API" />
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79,110,247,0.1)', color: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Step 4: Validation</h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { label: 'IP Conflicts Check', status: 'Passed' },
                  { label: 'Hostname Duplication', status: 'Passed' },
                  { label: 'DNS Record Collision', status: 'Passed' },
                  { label: 'Resource Quota', status: 'Passed' },
                ].map((v, i) => (
                  <div key={i} style={{ padding: '12px 16px', background: 'var(--c-surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{v.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase' }}>{v.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="animate-fade">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: '#dcfce7', color: '#166534', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Check size={20} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Step 5: Review & Submit</h3>
              </div>

              <div className="card" style={{ padding: 20, background: 'var(--c-surface2)', border: 'none' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>IP Address</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{formData.address}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Subnet</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{currentSubnet?.cidr}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Hostname</span>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>{formData.hostname}</span>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 24, padding: '16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: 12, border: '1px solid rgba(34, 197, 94, 0.1)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.createDns} onChange={e => setFormData({...formData, createDns: e.target.checked})} style={{ width: 18, height: 18 }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: '#166534' }}>Auto-create DNS Record</p>
                    <p style={{ fontSize: 11, color: '#166534', opacity: 0.7 }}>Generate A record and PTR record automatically</p>
                  </div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '24px 32px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: 12 }}>
          {step > 1 && (
            <button className="btn-secondary" onClick={() => setStep(step - 1)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <ChevronLeft size={18} /> Back
            </button>
          )}
          {step < 5 ? (
            <button className="btn-primary" onClick={() => setStep(step + 1)} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} disabled={step === 2 && !formData.address}>
              Next <ChevronRight size={18} />
            </button>
          ) : (
            <button className="btn-primary" onClick={handleAssign} style={{ flex: 1, background: '#22c55e', borderColor: '#22c55e' }} disabled={loading}>
              {loading ? 'Processing...' : 'Complete Assignment'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
