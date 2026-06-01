import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  AlertTriangle, Clock, CheckCircle2, ChevronRight, ChevronDown,
  Calendar, BarChart3, Filter, MessageSquare, Plus, X, Server
} from 'lucide-react';

export default function HardwareIssuesPage() {
  const { apiFetch } = useAuth();
  const [issues, setIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'yearly'
  const [expandedId, setExpandedId] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateForm, setUpdateForm] = useState({ status: '', note: '', issueId: null });
  const [notification, setNotification] = useState(null); // { type, title, message }
  const [statusFilter, setStatusFilter] = useState('All');

  const fetchData = async () => {
    try {
      const res = await apiFetch('/hardware-issues');
      setIssues(await res.json());
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateStatus = async () => {
    if (!updateForm.note.trim()) {
      setNotification({
        type: 'error',
        title: 'Note Required',
        message: 'A process note is mandatory when changing the issue status.'
      });
      return;
    }
    try {
      await apiFetch(`/hardware-issues/${updateForm.issueId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: updateForm.status, note: updateForm.note })
      });
      setShowUpdateModal(false);
      fetchData();
    } catch (e) {
      setNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to update the hardware issue. Please try again.'
      });
    }
  };

  const getStats = () => {
    const open = issues.filter(i => i.status === 'Open').length;
    const processing = issues.filter(i => i.status === 'Processing').length;
    const closed = issues.filter(i => i.status === 'Closed').length;
    return { open, processing, closed, total: issues.length };
  };

  const stats = getStats();

  const getChartData = () => {
    const now = new Date();
    if (viewMode === 'monthly') {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleString('default', { month: 'short' });
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = issues.filter(iss => iss.createdAt.startsWith(key)).length;
        months.push({ label, count });
      }
      return months;
    } else {
      const years = [];
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        const count = issues.filter(iss => iss.createdAt.startsWith(String(year))).length;
        years.push({ label: String(year), count });
      }
      return years;
    }
  };

  const chartData = getChartData();
  const maxCount = Math.max(...chartData.map(d => d.count), 1);

  const filteredIssues = issues.filter(i => statusFilter === 'All' || i.status === statusFilter);

  if (loading) return <div className="flex-center h-full"><div className="spinner" /></div>;

  return (
    <div className="animate-fade" style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 4 }}>Hardware Issues</h1>
          <p style={{ color: 'var(--c-text-sec)', fontSize: 14 }}>Track and manage hardware failures across all data centers</p>
        </div>
      </header>

      {/* Dashboard Stats & Trends (Single Row) */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(4, 1fr) 280px', 
        gap: 16, 
        marginBottom: 24 
      }}>
        <StatCard label="Open" value={stats.open} color="#ef4444" icon={<AlertTriangle size={18} />} />
        <StatCard label="Processing" value={stats.processing} color="#f59e0b" icon={<Clock size={18} />} />
        <StatCard label="Closed" value={stats.closed} color="#22c55e" icon={<CheckCircle2 size={18} />} />
        <StatCard label="Total" value={stats.total} color="var(--c-accent)" icon={<BarChart3 size={18} />} />
        
        <div className="card" style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <h2 style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text-sec)' }}>Trends</h2>
            <select 
              value={viewMode} 
              onChange={e => setViewMode(e.target.value)}
              style={{ fontSize: 10, background: 'var(--c-surface2)', border: 'none', padding: '1px 4px', borderRadius: 4 }}
            >
              <option value="monthly">Mon</option>
              <option value="yearly">Year</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 40 }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                <div style={{ 
                  width: '100%', 
                  height: `${(d.count / maxCount) * 30}px`, 
                  background: 'var(--c-accent)', 
                  borderRadius: '2px 2px 0 0',
                  opacity: 0.8
                }} />
                <span style={{ fontSize: 8, color: 'var(--c-text-sec)', transform: 'scale(0.9)' }}>{d.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Issue Table */}
      <section>
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface2)' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Issue Table</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>Filter Status:</span>
              <select 
                className="form-input" 
                style={{ width: 120, padding: '4px 8px', fontSize: 13 }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="All">All Status</option>
                <option value="Open">Open</option>
                <option value="Processing">Processing</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          
          <div style={{ maxHeight: 'calc(100vh - 450px)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, background: 'var(--c-surface)', zIndex: 10 }}>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--c-border)' }}>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Device</th>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Location</th>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Failed Parts</th>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Urgency</th>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '12px 20px', fontSize: 12, color: 'var(--c-text-sec)', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '12px 20px', width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {filteredIssues.length > 0 ? filteredIssues.map(issue => (
                  <React.Fragment key={issue.id}>
                    <tr 
                      onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                      style={{ 
                        borderBottom: '1px solid var(--c-border)', 
                        cursor: 'pointer',
                        background: expandedId === issue.id ? 'var(--c-surface2)' : 'transparent',
                        transition: 'background 0.2s'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontWeight: 700 }}>{issue.deviceName}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>SN: {issue.serialNumber}</div>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ fontSize: 13 }}>{issue.idc}</div>
                        <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>Rack: {issue.rack} • {issue.u}U</div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 13 }}>{issue.failedParts}</td>
                      <td style={{ padding: '16px 20px' }}>
                        <span style={{ 
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                          background: issue.urgency === 'Critical' ? 'rgba(239,68,68,0.1)' : 'rgba(79,110,247,0.1)',
                          color: issue.urgency === 'Critical' ? '#ef4444' : 'var(--c-accent)'
                        }}>{issue.urgency}</span>
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ 
                          display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600,
                          color: issue.status === 'Open' ? '#ef4444' : issue.status === 'Processing' ? '#f59e0b' : '#22c55e'
                        }}>
                          {issue.status === 'Open' ? <AlertTriangle size={14} /> : issue.status === 'Processing' ? <Clock size={14} /> : <CheckCircle2 size={14} />}
                          {issue.status}
                        </div>
                      </td>
                      <td style={{ padding: '16px 20px', fontSize: 12, color: 'var(--c-text-sec)' }}>
                        {new Date(issue.createdAt).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '16px 20px', color: 'var(--c-text-sec)' }}>
                        {expandedId === issue.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </td>
                    </tr>
                    {expandedId === issue.id && (
                      <tr>
                        <td colSpan="7" style={{ padding: '0 20px 20px', background: 'var(--c-surface2)' }}>
                          <div className="animate-slide-up" style={{ 
                            background: 'var(--c-surface)', padding: 24, borderRadius: 12, border: '1px solid var(--c-border)',
                            display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 32
                          }}>
                            {/* Left: Info */}
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>Issue Details</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                <DetailRow label="Parts Information" value={issue.partsInfo || 'N/A'} />
                                <DetailRow label="Reporter" value={issue.reporter} />
                                <DetailRow label="Last Updated" value={new Date(issue.updatedAt).toLocaleString()} />
                              </div>

                              {issue.status !== 'Closed' && (
                                <div style={{ marginTop: 32 }}>
                                  <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 12, color: 'var(--c-text-sec)' }}>Quick Actions</h4>
                                  <div style={{ display: 'flex', gap: 12 }}>
                                    {issue.status === 'Open' && (
                                      <button 
                                        className="btn-secondary" 
                                        style={{ flex: 1, borderColor: '#f59e0b', color: '#f59e0b' }}
                                        onClick={() => {
                                          setUpdateForm({ status: 'Processing', note: '', issueId: issue.id });
                                          setShowUpdateModal(true);
                                        }}
                                      >Set to Processing</button>
                                    )}
                                    <button 
                                      className="btn-primary" 
                                      style={{ flex: 1, background: '#22c55e', borderColor: '#22c55e' }}
                                      onClick={() => {
                                        setUpdateForm({ status: 'Closed', note: '', issueId: issue.id });
                                        setShowUpdateModal(true);
                                      }}
                                    >Close Issue</button>
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right: History */}
                            <div>
                              <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, borderBottom: '1px solid var(--c-border)', paddingBottom: 8 }}>Process History</h3>
                              <div style={{ maxHeight: 250, overflowY: 'auto', paddingRight: 8 }}>
                                {issue.history.map((h, i) => (
                                  <div key={i} style={{ 
                                    padding: '12px 16px', borderRadius: 8, background: 'var(--c-surface2)', 
                                    marginBottom: 10, borderLeft: `4px solid ${h.status === 'Open' ? '#ef4444' : h.status === 'Processing' ? '#f59e0b' : '#22c55e'}`
                                  }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                                      <span style={{ fontWeight: 700 }}>{h.status}</span>
                                      <span style={{ color: 'var(--c-text-sec)' }}>{new Date(h.date).toLocaleString()}</span>
                                    </div>
                                    <p style={{ fontSize: 13, lineHeight: 1.4 }}>{h.note}</p>
                                    <div style={{ fontSize: 11, color: 'var(--c-text-sec)', marginTop: 4 }}>By: {h.user}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )) : (
                  <tr>
                    <td colSpan="7" style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-sec)' }}>No issues found matching filters</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {showUpdateModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content animate-slide-up" style={{ width: 450, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700 }}>Update Status: {updateForm.status}</h2>
              <button onClick={() => setShowUpdateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-sec)' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'rgba(79,110,247,0.05)', padding: 12, borderRadius: 8, fontSize: 13, border: '1px solid rgba(79,110,247,0.1)' }}>
                <strong>Confirm Status:</strong> {updateForm.status}
              </div>
              <div>
                <label className="form-label">Process Note (Required)</label>
                <textarea 
                  className="form-input" 
                  style={{ height: 120, resize: 'none' }}
                  value={updateForm.note}
                  onChange={e => setUpdateForm({...updateForm, note: e.target.value})}
                  placeholder="Detail the actions taken or reason for closing..."
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button className="btn-primary" style={{ flex: 1 }} onClick={handleUpdateStatus}>Submit Update</button>
                <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowUpdateModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification && (
        <NotificationModal 
          {...notification}
          onClose={() => setNotification(null)}
        />
      )}
    </div>
  );
}

function NotificationModal({ type, title, message, onClose }) {
  return (
    <div className="modal-overlay" style={{ zIndex: 120 }}>
      <div className="modal-content animate-slide-up" style={{ width: 380, padding: 24, textAlign: 'center' }}>
        <div style={{ 
          width: 60, height: 60, borderRadius: '50%', 
          background: type === 'success' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px',
          color: type === 'success' ? '#22c55e' : '#ef4444'
        }}>
          {type === 'success' ? <CheckCircle2 size={32} /> : <X size={32} />}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>Great</button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px' }}>
      <div style={{ 
        width: 36, height: 36, borderRadius: 10, 
        background: 'var(--c-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: color, flexShrink: 0
      }}>
        {icon}
      </div>
      <div style={{ overflow: 'hidden' }}>
        <div style={{ fontSize: 11, color: 'var(--c-text-sec)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
      </div>
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
      <span style={{ color: 'var(--c-text-sec)', fontSize: 12 }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: 13 }}>{value}</span>
    </div>
  );
}
