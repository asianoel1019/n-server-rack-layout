import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { 
  ShieldCheck, ShieldAlert, Plus, Edit, Trash2, Search, Calendar, FileCode,
  AlertTriangle, CheckCircle, Upload, X, Globe, Download, Award
} from 'lucide-react';

export default function SSLCertificatePage() {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [certs, setCerts] = useState([]);
  const [dnsRecords, setDnsRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [form, setForm] = useState({
    name: '', issuer: '', commonName: '', sans: '',
    validFrom: '', validTo: '', expiryDaysWarning: 30,
    files: []
  });

  const fetchData = async () => {
    try {
      const [certsRes, dnsRes] = await Promise.all([
        apiFetch('/certificates'),
        apiFetch('/dns')
      ]);
      setCerts(await certsRes.json());
      setDnsRecords(await dnsRes.json());
    } catch (e) {
      console.error('Failed to fetch certificates data', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getCertStatus = (cert) => {
    const today = new Date();
    const end = new Date(cert.validTo);
    if (today > end) return 'Expired';
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= (cert.expiryDaysWarning || 30)) return 'Expiring Soon';
    return 'Active';
  };

  // Wildcard and SAN matching logic
  const matchesDomain = (pattern, fqdn) => {
    if (!pattern || !fqdn) return false;
    const cleanPattern = pattern.trim().toLowerCase();
    const cleanFqdn = fqdn.trim().toLowerCase();
    if (cleanPattern === cleanFqdn) return true;
    if (cleanPattern.startsWith('*.')) {
      const suffix = cleanPattern.slice(1); // e.g. .example.com
      return cleanFqdn.endsWith(suffix) && cleanFqdn.split('.').length === cleanPattern.split('.').length;
    }
    return false;
  };

  const getLinkedDnsRecords = (cert) => {
    return dnsRecords.filter(rec => {
      const isCnMatch = matchesDomain(cert.commonName, rec.fqdn);
      const isSanMatch = (cert.sans || []).some(san => matchesDomain(san, rec.fqdn));
      return isCnMatch || isSanMatch;
    });
  };

  const handleOpenAdd = () => {
    setEditingCert(null);
    setForm({
      name: '', issuer: 'Let\'s Encrypt', commonName: '', sans: '',
      validFrom: new Date().toISOString().split('T')[0],
      validTo: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      expiryDaysWarning: 30,
      files: []
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (cert) => {
    setEditingCert(cert);
    setForm({
      name: cert.name,
      issuer: cert.issuer,
      commonName: cert.commonName,
      sans: (cert.sans || []).join(', '),
      validFrom: cert.validFrom,
      validTo: cert.validTo,
      expiryDaysWarning: cert.expiryDaysWarning || 30,
      files: cert.files || []
    });
    setShowFormModal(true);
  };

  const handleFileUpload = (e) => {
    const uploadedFiles = Array.from(e.target.files);
    const allowedExtensions = ['pem', 'key', 'crt', 'cer', 'pfx', 'p12', 'jks'];

    uploadedFiles.forEach(file => {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        showAlert(`Unsupported file extension: .${ext}. Allowed types: ${allowedExtensions.join(', ')}`, 'Error');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setForm(prev => {
          // Prevent duplicates
          if (prev.files.some(f => f.name === file.name)) return prev;
          return {
            ...prev,
            files: [...prev.files, {
              name: file.name,
              type: ext,
              size: file.size,
              content: reader.result
            }]
          };
        });
      };
      
      // For pfx/p12/jks read as data url (base64 binary), for keys/certs we can read as Text or Data URL. Let's use data URL.
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (fileName) => {
    setForm(prev => ({
      ...prev,
      files: prev.files.filter(f => f.name !== fileName)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.commonName || !form.validFrom || !form.validTo) {
      await showAlert('Please fill in all required fields.', 'Validation Error');
      return;
    }

    const sansArray = form.sans
      ? form.sans.split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    try {
      const method = editingCert ? 'PUT' : 'POST';
      const url = editingCert ? `/certificates/${editingCert.id}` : '/certificates';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...form,
          sans: sansArray
        })
      });
      
      if (res.ok) {
        setShowFormModal(false);
        fetchData();
      } else {
        const err = await res.json();
        await showAlert(err.error || 'Failed to save certificate', 'Error');
      }
    } catch (e) {
      await showAlert('Failed to save certificate', 'Error');
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm(`Are you sure you want to delete SSL Certificate "${name}"?`, 'Delete SSL Certificate');
    if (!confirmed) return;
    
    try {
      const res = await apiFetch(`/certificates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        await showAlert('Failed to delete certificate', 'Error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDownloadFile = (fileObj) => {
    const link = document.createElement('a');
    link.href = fileObj.content;
    link.download = fileObj.name;
    link.click();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  // Calculate Metrics
  const activeCount = certs.filter(c => getCertStatus(c) === 'Active').length;
  const expiringCount = certs.filter(c => getCertStatus(c) === 'Expiring Soon').length;
  const expiredCount = certs.filter(c => getCertStatus(c) === 'Expired').length;
  const totalFiles = certs.reduce((sum, c) => sum + (c.files?.length || 0), 0);

  // Filter Certificates
  const filteredCerts = certs.filter(c => {
    const status = getCertStatus(c);
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.commonName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.issuer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="animate-fade" style={{ padding: '24px 32px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Award size={24} style={{ color: 'var(--c-accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>SSL Certificate Center</h1>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Certificate
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Active Certificates</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} /> {activeCount}
          </h3>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Expiring Soon Alert</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangle size={18} style={{ color: '#f59e0b' }} /> {expiringCount}
          </h3>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Expired Coverage</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <ShieldAlert size={18} style={{ color: '#ef4444' }} /> {expiredCount}
          </h3>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Secured Files Stored</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <FileCode size={18} style={{ color: 'var(--c-accent)' }} /> {totalFiles} Files
          </h3>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-sec)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 38 }} 
            placeholder="Search by certificate name, common name, or issuer..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', background: 'var(--c-surface2)', padding: 4, borderRadius: 8, border: '1px solid var(--c-border)' }}>
          {['All', 'Active', 'Expiring Soon', 'Expired'].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 6, cursor: 'pointer',
                background: statusFilter === status ? 'var(--c-surface)' : 'transparent',
                color: statusFilter === status ? 'var(--c-accent)' : 'var(--c-text-sec)',
                transition: 'all 0.15s'
              }}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Certificates Cards Grid */}
      {filteredCerts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: '1px dashed var(--c-border)', borderRadius: 12, background: 'var(--c-surface)' }}>
          <div style={{ textAlign: 'center', color: 'var(--c-text-sec)' }}>
            <ShieldAlert size={48} style={{ opacity: 0.2, marginBottom: 12, margin: '0 auto' }} />
            <p style={{ margin: 0 }}>No certificates found.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 20 }}>
          {filteredCerts.map(c => {
            const status = getCertStatus(c);
            const statusColor = status === 'Active' ? '#22c55e' : status === 'Expiring Soon' ? '#f59e0b' : '#ef4444';
            
            // Calculate time progress bar
            const start = new Date(c.validFrom);
            const end = new Date(c.validTo);
            const today = new Date();
            const totalDur = end - start;
            const elapsed = today - start;
            const pct = totalDur > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDur) * 100))) : 100;

            const linkedDns = getLinkedDnsRecords(c);

            return (
              <div 
                key={c.id} 
                style={{ 
                  background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 20, 
                  display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--c-text)' }}>{c.name}</h3>
                    <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--c-accent)' }}>{c.commonName}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--c-text-sec)' }}>Issuer: {c.issuer}</p>
                  </div>
                  
                  {/* Status Badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33`
                  }}>
                    {status}
                  </span>
                </div>

                {/* SANs display */}
                {c.sans && c.sans.length > 0 && (
                  <div>
                    <span style={{ fontSize: 10, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Alternative Domains (SANs)</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {c.sans.map(san => (
                        <span key={san} style={{ fontSize: 11, background: 'var(--c-surface2)', padding: '2px 8px', borderRadius: 4, border: '1px solid var(--c-border)' }}>{san}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-sec)', marginBottom: 4 }}>
                    <span>Validity Period</span>
                    <span>Expires {c.validTo}</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--c-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: statusColor, transition: 'width 0.3s' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--c-text-sec)', marginTop: 4 }}>
                    <span>Started: {c.validFrom}</span>
                    <span>Notice: {c.expiryDaysWarning || 30} days prior</span>
                  </div>
                </div>

                {/* Uploaded Files Chips */}
                <div>
                  <span style={{ fontSize: 10, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Cert & Key Files ({c.files?.length || 0})</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                    {(c.files || []).map(f => (
                      <div key={f.name} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', background: 'var(--c-surface)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--c-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <FileCode size={13} style={{ color: 'var(--c-accent)' }} />
                          <span style={{ fontSize: 12, color: 'var(--c-text)', fontWeight: 500 }}>{f.name}</span>
                          <span style={{ fontSize: 10, color: 'var(--c-text-sec)' }}>({Math.round(f.size / 10.24) / 100} KB)</span>
                        </div>
                        <button 
                          style={{ background: 'none', border: 'none', color: 'var(--c-accent)', cursor: 'pointer', padding: 0 }}
                          onClick={() => handleDownloadFile(f)}
                          title="Download file"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Linked DNS Records */}
                <div>
                  <span style={{ fontSize: 10, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Covered DNS Records ({linkedDns.length})</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {linkedDns.length === 0 ? (
                      <span style={{ fontSize: 11, color: 'var(--c-text-sec)', fontStyle: 'italic' }}>No active FQDNs matching in DNS Manager</span>
                    ) : (
                      linkedDns.map(d => (
                        <span key={d.id} style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.08)', padding: '2px 8px', borderRadius: 4, border: '1px solid rgba(16,185,129,0.2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Globe size={10} /> {d.fqdn}
                        </span>
                      ))
                    )}
                  </div>
                </div>

                {/* Card Action Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, borderTop: '1px solid var(--c-border)', paddingTop: 12, marginTop: 4 }}>
                  <button className="btn-secondary" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleOpenEdit(c)}>
                    <Edit size={14} style={{ marginRight: 4 }} /> Edit
                  </button>
                  <button className="btn-danger" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleDelete(c.id, c.name)}>
                    <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFormModal(false)}>
          <div className="modal-content animate-fade" style={{ maxWidth: 640 }}>
            <div className="modal-header">
              <h2>{editingCert ? 'Edit SSL Certificate' : 'Add SSL Certificate'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Certificate Name *</label>
                    <input 
                      className="form-input" 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g. Star Domain Wildcard"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Common Name (CN) *</label>
                    <input 
                      className="form-input" 
                      value={form.commonName} 
                      onChange={e => setForm({ ...form, commonName: e.target.value })} 
                      placeholder="e.g. *.example.com"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Issuer *</label>
                    <input 
                      className="form-input" 
                      value={form.issuer} 
                      onChange={e => setForm({ ...form, issuer: e.target.value })} 
                      placeholder="e.g. Let's Encrypt / DigiCert"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Warning Threshold (Days) *</label>
                    <input 
                      type="number"
                      min="1"
                      className="form-input" 
                      value={form.expiryDaysWarning} 
                      onChange={e => setForm({ ...form, expiryDaysWarning: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Valid From *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.validFrom} 
                      onChange={e => setForm({ ...form, validFrom: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Valid To *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.validTo} 
                      onChange={e => setForm({ ...form, validTo: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Subject Alternative Names (SANs) - Comma separated</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: 50, resize: 'none' }}
                    value={form.sans} 
                    onChange={e => setForm({ ...form, sans: e.target.value })} 
                    placeholder="e.g. domain.com, api.domain.com, mail.domain.com"
                  />
                </div>

                {/* Upload Section */}
                <div>
                  <label className="form-label">Upload Key/Certificate Files (.pem, .key, .crt, .cer, .pfx, .p12, .jks)</label>
                  <div style={{ 
                    border: '2px dashed var(--c-border)', borderRadius: 10, padding: '20px 10px', 
                    textAlign: 'center', cursor: 'pointer', background: 'var(--c-surface)',
                    position: 'relative'
                  }}>
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFileUpload}
                      style={{ 
                        position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' 
                      }} 
                    />
                    <Upload size={24} style={{ color: 'var(--c-accent)', margin: '0 auto 8px' }} />
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Click or Drag files here to upload</p>
                    <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--c-text-sec)' }}>PEM, KEY, CRT, CER, PFX, P12, JKS supported</p>
                  </div>

                  {/* Uploaded Files Grid */}
                  {form.files && form.files.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                      {form.files.map(f => (
                        <div key={f.name} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', background: 'var(--c-surface2)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--c-border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <FileCode size={14} style={{ color: 'var(--c-accent)' }} />
                            <span style={{ fontSize: 12, fontWeight: 600 }}>{f.name}</span>
                            <span style={{ fontSize: 10, color: 'var(--c-text-sec)' }}>({Math.round(f.size / 10.24) / 100} KB)</span>
                          </div>
                          <button 
                            type="button" 
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 0 }}
                            onClick={() => removeFile(f.name)}
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingCert ? 'Save Changes' : 'Add Certificate'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
