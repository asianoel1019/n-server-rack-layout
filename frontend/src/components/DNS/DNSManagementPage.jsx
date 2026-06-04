import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { 
  Globe, Search, Plus, FolderTree, FileCode, CheckCircle2, 
  AlertTriangle, Activity, Trash2, ExternalLink, Zap, 
  ShieldCheck, Clock, Server, Pencil, ChevronRight, ChevronDown
} from 'lucide-react';

export default function DNSManagementPage() {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [records, setRecords] = useState([]);
  const [certs, setCerts] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [selectedParentDomain, setSelectedParentDomain] = useState(null);
  const [newRecord, setNewRecord] = useState({ fqdn: '', host: '', type: 'A', value: '', ttl: 3600, description: '' });

  // Tree states
  const [expandedDomains, setExpandedDomains] = useState(new Set());

  // Resolve Tester state
  const [testFqdn, setTestFqdn] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [validatingAll, setValidatingAll] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      const [dnsRes, certsRes] = await Promise.all([
        apiFetch('/dns'),
        apiFetch('/certificates')
      ]);
      const dnsData = await dnsRes.json();
      const certsData = await certsRes.json();
      setRecords(dnsData);
      setCerts(certsData);
      if (dnsData.length > 0 && !selectedRecord) setSelectedRecord(dnsData[0]);
    } catch (e) {}
    setLoading(false);
  };

  const matchesDomain = (pattern, fqdn) => {
    if (!pattern || !fqdn) return false;
    const cleanPattern = pattern.trim().toLowerCase();
    const cleanFqdn = fqdn.trim().toLowerCase();
    if (cleanPattern === cleanFqdn) return true;
    if (cleanPattern.startsWith('*.')) {
      const suffix = cleanPattern.slice(1);
      return cleanFqdn.endsWith(suffix) && cleanFqdn.split('.').length === cleanPattern.split('.').length;
    }
    return false;
  };

  const getCertStatus = (cert) => {
    const today = new Date();
    const end = new Date(cert.validTo);
    if (today > end) return 'Expired';
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= (cert.expiryDaysWarning || 30)) return 'Expiring Soon';
    return 'Active';
  };

  const getSslCertificate = (fqdn) => {
    return certs.find(c => {
      const isCnMatch = matchesDomain(c.commonName, fqdn);
      const isSanMatch = (c.sans || []).some(san => matchesDomain(san, fqdn));
      return isCnMatch || isSanMatch;
    });
  };

  const handleValidateAll = async () => {
    setValidatingAll(true);
    try {
      for (const rec of records) {
        await apiFetch('/dns/test', {
          method: 'POST',
          body: JSON.stringify({ fqdn: rec.fqdn })
        });
      }
      await fetchRecords();
      await showAlert('All DNS records have been validated successfully!', 'Success');
    } catch (e) {
      await showAlert('Error during batch validation', 'Error');
    }
    setValidatingAll(false);
  };

  const handleAddRecord = async () => {
    const fqdnToSubmit = selectedParentDomain 
      ? `${newRecord.host}.${selectedParentDomain}`
      : newRecord.fqdn;

    if (!fqdnToSubmit || !newRecord.value) return;
    try {
      const url = editingRecord ? `/dns/${editingRecord.id}` : '/dns';
      const method = editingRecord ? 'PUT' : 'POST';
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...newRecord,
          fqdn: fqdnToSubmit
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setEditingRecord(null);
        setSelectedParentDomain(null);
        setNewRecord({ fqdn: '', host: '', type: 'A', value: '', ttl: 3600, description: '' });
        fetchRecords();
      }
    } catch (e) {}
  };

  const handleAddSubRecord = (domain) => {
    setSelectedParentDomain(domain);
    setNewRecord({ fqdn: '', host: '', type: 'A', value: '', ttl: 3600, description: '' });
    setShowAddModal(true);
  };

  const handleEditClick = (rec) => {
    setEditingRecord(rec);
    setSelectedParentDomain(null);
    setNewRecord({
      fqdn: rec.fqdn,
      type: rec.type,
      value: rec.value,
      ttl: rec.ttl,
      description: rec.description
    });
    setShowAddModal(true);
  };

  const toggleDomain = (domain) => {
    const next = new Set(expandedDomains);
    if (next.has(domain)) next.delete(domain);
    else next.add(domain);
    setExpandedDomains(next);
  };

  const handleTestDNS = async (fqdn) => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await apiFetch('/dns/test', {
        method: 'POST',
        body: JSON.stringify({ fqdn: fqdn || testFqdn })
      });
      const data = await res.json();
      setTestResult(data);
    } catch (e) {
      setTestResult({ error: 'Failed to resolve host' });
    }
    setTesting(false);
  };

  const handleDelete = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this DNS record?', 'Delete DNS Record');
    if (!confirmed) return;
    try {
      await apiFetch(`/dns/${id}`, { method: 'DELETE' });
      fetchRecords();
      setSelectedRecord(null);
    } catch (e) {}
  };

  // Group records by domain for the Tree View
  const domains = records.reduce((acc, rec) => {
    const parts = rec.fqdn.split('.');
    const domain = parts.slice(-2).join('.');
    if (!acc[domain]) acc[domain] = [];
    acc[domain].push(rec);
    return acc;
  }, {});

  if (loading) return <div className="p-8">Loading DNS Records...</div>;

  const matchedCert = selectedRecord ? getSslCertificate(selectedRecord.fqdn) : null;
  const certStatus = matchedCert ? getCertStatus(matchedCert) : null;
  const certStatusColor = certStatus === 'Active' ? '#22c55e' : certStatus === 'Expiring Soon' ? '#f59e0b' : '#ef4444';

  return (
    <div style={{ padding: '24px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 700 }}>DNS / FQDN Binding Center</h2>
          <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginTop: 4 }}>Manage domains, records and resolution health</p>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button 
            className="btn-secondary" 
            onClick={handleValidateAll}
            disabled={validatingAll || records.length === 0}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <Activity size={18} className={validatingAll ? 'animate-pulse' : ''} />
            {validatingAll ? 'Validating...' : 'Validate All'}
          </button>
          <button className="btn-primary" onClick={() => { setSelectedParentDomain(null); setShowAddModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={18} /> New Domain
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left Pane: FQDN Tree */}
        <div className="card" style={{ width: 320, padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-sec)' }} />
              <input 
                type="text" className="form-input" placeholder="Filter domains..." 
                style={{ paddingLeft: 32, fontSize: 13, height: 36, margin: 0 }}
                value={search} onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
            {Object.entries(domains).map(([domain, recs]) => {
              const isExpanded = expandedDomains.has(domain);
              const sortedRecs = [...recs].sort((a, b) => a.fqdn.localeCompare(b.fqdn));
              
              return (
                <div key={domain} style={{ marginBottom: 4 }}>
                  <div style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 8px', 
                    fontSize: 12, fontWeight: 700, color: 'var(--c-text-sec)', textTransform: 'uppercase',
                    cursor: 'pointer', borderRadius: 8, transition: 'background 0.2s'
                  }} className="hover:bg-gray-100" onClick={() => toggleDomain(domain)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <FolderTree size={14} /> {domain}
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleAddSubRecord(domain); }}
                      style={{ 
                        border: 'none', background: 'transparent', color: 'var(--c-accent)', 
                        cursor: 'pointer', padding: 4, display: 'flex' 
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <div style={{ paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
                      {sortedRecs.map(r => (
                        <button 
                          key={r.id}
                          onClick={() => setSelectedRecord(r)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', 
                            borderRadius: 8, border: 'none', background: selectedRecord?.id === r.id ? 'rgba(79,110,247,0.08)' : 'transparent',
                            color: selectedRecord?.id === r.id ? 'var(--c-accent)' : 'var(--c-text)',
                            textAlign: 'left', cursor: 'pointer', transition: 'all 0.2s', width: '100%'
                          }}
                        >
                          <FileCode size={14} opacity={0.6} />
                          <span style={{ fontSize: 13, fontWeight: selectedRecord?.id === r.id ? 600 : 400 }}>{r.fqdn.split('.')[0]}</span>
                          <span style={{ marginLeft: 'auto', fontSize: 10, padding: '2px 5px', background: 'rgba(0,0,0,0.05)', borderRadius: 4 }}>{r.type}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane: Record Detail & Tester */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, overflowY: 'auto' }}>
          {selectedRecord ? (
            <>
              {/* Record Info */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ 
                      width: 54, height: 54, borderRadius: 12, background: 'var(--c-surface2)', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-accent)' 
                    }}>
                      <Globe size={28} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 20, fontWeight: 700 }}>{selectedRecord.fqdn}</h3>
                      <div style={{ display: 'flex', gap: 12, marginTop: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: 12, padding: '3px 8px', background: 'var(--c-accent)', color: 'white', borderRadius: 6, fontWeight: 700 }}>{selectedRecord.type}</span>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>TTL: {selectedRecord.ttl}s</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: '#22c55e' }}>
                          <CheckCircle2 size={14} /> Active
                        </span>
                        {matchedCert && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, color: certStatusColor }}>
                            <ShieldCheck size={14} /> SSL Secured
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="icon-btn" title="Test Resolution" onClick={() => handleTestDNS(selectedRecord.fqdn)}>
                      <Zap size={18} />
                    </button>
                    <button className="icon-btn" title="Edit Record" onClick={() => handleEditClick(selectedRecord)}>
                      <Pencil size={18} />
                    </button>
                    <button className="icon-btn" style={{ color: '#ef4444' }} title="Delete Record" onClick={() => handleDelete(selectedRecord.id)}>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                  <div style={{ padding: 16, background: 'var(--c-surface2)', borderRadius: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase', marginBottom: 6 }}>Target Value</p>
                    <p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace' }}>{selectedRecord.value}</p>
                  </div>
                  <div style={{ padding: 16, background: 'var(--c-surface2)', borderRadius: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase', marginBottom: 6 }}>Last Checked</p>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{new Date(selectedRecord.lastChecked).toLocaleString()}</p>
                  </div>
                  <div style={{ padding: 16, background: 'var(--c-surface2)', borderRadius: 12 }}>
                    <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase', marginBottom: 6 }}>Description</p>
                    <p style={{ fontSize: 14 }}>{selectedRecord.description || 'No description'}</p>
                  </div>
                </div>

                {/* SSL Coverage panel */}
                <div style={{ 
                  marginTop: 24, 
                  padding: 16, 
                  background: 'var(--c-surface2)', 
                  borderRadius: 12,
                  border: `1px solid ${matchedCert ? (certStatus === 'Expired' ? '#ef4444' : certStatus === 'Expiring Soon' ? '#f59e0b' : 'rgba(255,255,255,0.05)') : 'rgba(255,255,255,0.05)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <ShieldCheck size={18} style={{ color: matchedCert ? certStatusColor : 'var(--c-text-sec)' }} />
                      <span style={{ fontSize: 13, fontWeight: 700 }}>SSL Security Coverage</span>
                    </div>
                    {matchedCert && (
                      <span style={{ 
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                        background: `${certStatusColor}18`,
                        color: certStatusColor,
                        border: `1px solid ${certStatusColor}33`
                      }}>
                        {certStatus}
                      </span>
                    )}
                  </div>
                  
                  {matchedCert ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 16, marginTop: 12, fontSize: 12 }}>
                      <div>
                        <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Certificate Name</span>
                        <strong>{matchedCert.name} ({matchedCert.commonName})</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Issuer</span>
                        <strong>{matchedCert.issuer}</strong>
                      </div>
                      <div>
                        <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Expiry Date</span>
                        <strong>{matchedCert.validTo}</strong>
                      </div>
                    </div>
                  ) : (
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--c-text-sec)', fontStyle: 'italic' }}>
                      No active SSL Certificate covers this FQDN. Add a matching cert in the SSL Certificate Center.
                    </p>
                  )}
                </div>
              </div>

              {/* DNS Resolve Tester Section */}
              <div className="card" style={{ padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <ShieldCheck size={20} style={{ color: 'var(--c-accent)' }} />
                  <h3 style={{ fontSize: 18, fontWeight: 700 }}>DNS Resolve Tester</h3>
                </div>
                
                <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                  <input 
                    className="form-input" 
                    placeholder="Enter FQDN to test..." 
                    style={{ flex: 1, margin: 0 }}
                    value={testFqdn} onChange={e => setTestFqdn(e.target.value)}
                  />
                  <button className="btn-primary" onClick={() => handleTestDNS()} disabled={testing || !testFqdn}>
                    {testing ? 'Testing...' : 'Run Diagnostics'}
                  </button>
                </div>

                {testResult && (
                  <div style={{ 
                    padding: 24, background: 'var(--c-surface2)', borderRadius: 16,
                    border: '1px solid var(--c-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Resolved IP</span>
                        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: 'var(--c-accent)' }}>{testResult.resolvedIp}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>TTL</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{testResult.ttl}s</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>DNS Server</span>
                        <span style={{ fontSize: 14, fontWeight: 600 }}>{testResult.dnsServer}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Resolve Time</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: '#22c55e' }}>{testResult.resolveTime}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>PTR Match</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: testResult.ptrMatch ? '#22c55e' : '#ef4444' }}>
                          {testResult.ptrMatch ? 'Verified' : 'Mismatch'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>
                        <span style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Health Status</span>
                        <span style={{ 
                          fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 6,
                          background: '#dcfce7', color: '#166534', textTransform: 'uppercase' 
                        }}>
                          {testResult.healthStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Globe size={48} style={{ opacity: 0.1, marginBottom: 16 }} />
              <p style={{ color: 'var(--c-text-sec)' }}>Select a DNS record to view details</p>
            </div>
          )}
        </div>
      </div>
      {/* Add Record Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <h2>{editingRecord ? 'Edit DNS Record' : 'Create New DNS Record'}</h2>
              <button className="modal-close" onClick={() => { setShowAddModal(false); setEditingRecord(null); }}><Plus style={{ transform: 'rotate(45deg)' }} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">
                  {selectedParentDomain ? 'Host Prefix' : (editingRecord ? 'FQDN' : 'Domain Name')}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input 
                    className="form-input" 
                    style={{ flex: 1, margin: 0 }}
                    value={selectedParentDomain ? newRecord.host : newRecord.fqdn} 
                    onChange={e => selectedParentDomain 
                      ? setNewRecord({...newRecord, host: e.target.value})
                      : setNewRecord({...newRecord, fqdn: e.target.value})
                    } 
                    placeholder={selectedParentDomain ? "e.g. web-01" : "e.g. corp.local"} 
                  />
                  {selectedParentDomain && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text-sec)' }}>.{selectedParentDomain}</span>
                  )}
                </div>
              </div>

              {/* Only show these for Records, not for New Domain */}
              {(selectedParentDomain || editingRecord) && (
                <>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ width: 120 }}>
                      <label className="form-label">Type</label>
                      <select className="form-input" value={newRecord.type} onChange={e => setNewRecord({...newRecord, type: e.target.value})}>
                        <option>A</option>
                        <option>AAAA</option>
                        <option>CNAME</option>
                        <option>PTR</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label className="form-label">TTL (Seconds)</label>
                      <input type="number" className="form-input" value={newRecord.ttl} onChange={e => setNewRecord({...newRecord, ttl: parseInt(e.target.value)})} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Target Value (IP / Hostname)</label>
                    <input className="form-input" value={newRecord.value} onChange={e => setNewRecord({...newRecord, value: e.target.value})} placeholder="e.g. 192.168.1.10" />
                  </div>
                </>
              )}

              <div>
                <label className="form-label">Description</label>
                <textarea className="form-input" style={{ height: 80, resize: 'none' }} value={newRecord.description} onChange={e => setNewRecord({...newRecord, description: e.target.value})} placeholder={selectedParentDomain || editingRecord ? "Purpose of this record..." : "General description of this domain..."} />
              </div>
              <button className="btn-primary" style={{ marginTop: 8 }} onClick={async () => {
                // Auto-fill hidden fields for New Domain
                if (!selectedParentDomain && !editingRecord) {
                  setNewRecord(prev => ({ ...prev, type: 'SOA', value: 'Internal-SOA' }));
                  // Give a small timeout for state to update or just pass directly
                  const fqdnToSubmit = newRecord.fqdn;
                  if (!fqdnToSubmit) return;
                  try {
                    const res = await apiFetch('/dns', {
                      method: 'POST',
                      body: JSON.stringify({ ...newRecord, fqdn: fqdnToSubmit, type: 'SOA', value: 'Internal-SOA' })
                    });
                    if (res.ok) {
                      setShowAddModal(false);
                      setNewRecord({ fqdn: '', host: '', type: 'A', value: '', ttl: 3600, description: '' });
                      fetchRecords();
                    }
                  } catch (e) {}
                } else {
                  handleAddRecord();
                }
              }}>
                {editingRecord ? 'Update Record' : (selectedParentDomain ? 'Create Record' : 'Create Domain')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
