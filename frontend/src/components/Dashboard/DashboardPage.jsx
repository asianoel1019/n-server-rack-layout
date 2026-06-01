import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Server, Wifi, WifiOff, AlertTriangle, Building2, Cpu, HardDrive, TrendingUp, TrendingDown, Clock, Activity, ArrowUpRight, Filter, Trash2, Plus, Edit3, User } from 'lucide-react';

export default function DashboardPage({ deviceStatus, onSelectRack }) {
  const { apiFetch } = useAuth();
  const [datacenters, setDatacenters] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deviceTab, setDeviceTab] = useState('all');
  const [page, setPage] = useState(1);
  const itemsPerPage = 6;

  useEffect(() => {
    Promise.all([
      apiFetch('/datacenters').then(r => r.json()),
      apiFetch('/audit').then(r => r.json()).catch(() => [])
    ]).then(([dcs, auditLogs]) => {
      setDatacenters(dcs);
      setLogs(auditLogs);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [apiFetch]);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [deviceTab]);

  // Aggregate stats
  let totalDevices = 0, online = 0, offline = 0, warnings = 0, totalRacks = 0;
  const allDevices = [];
  datacenters.forEach(dc => {
    (dc.racks || []).forEach(rack => {
      totalRacks++;
      (rack.devices || []).forEach(dev => {
        totalDevices++;
        allDevices.push({ ...dev, dcName: dc.name, rackName: rack.name, dcId: dc.id, rackId: rack.id });
        const s = deviceStatus?.[dev.id]?.status || dev.status || 'unknown';
        if (s === 'online') online++;
        else if (s === 'offline' || s === 'error') offline++;
        else if (s === 'warning') warnings++;
      });
    });
  });

  const uptimeRate = totalDevices > 0 ? ((online / totalDevices) * 100).toFixed(1) : '0.0';
  const avgDelay = totalDevices > 0 ? Math.floor(Math.random() * 8 + 2) : 0;

  // Filter devices based on tab
  const filteredDevices = allDevices.filter(dev => {
    if (deviceTab === 'all') return true;
    const s = deviceStatus?.[dev.id]?.status || dev.status || 'unknown';
    if (deviceTab === 'online') return s === 'online';
    if (deviceTab === 'warning') return s === 'warning';
    if (deviceTab === 'offline') return s === 'offline' || s === 'error';
    return true;
  });

  const totalPages = Math.ceil(filteredDevices.length / itemsPerPage);
  const currentDevices = filteredDevices.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  // Mini bar chart data (fake weekly uptime)
  const barData = [88, 92, 95, 90, 97, 94, 99];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1400 }}>
      {/* Top row: Map/Visualization + KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 28 }}>
        {/* Rack Overview Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--c-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--c-text)' }}>
                Rack Overview
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginLeft: 16 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--c-text-sec)' }}>
                  <span className="status-dot green" /> Online ({online})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--c-text-sec)' }}>
                  <span className="status-dot orange" /> Warning ({warnings})
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--c-text-sec)' }}>
                  <span className="status-dot gray" /> Offline ({offline})
                </span>
              </div>
            </div>
          </div>

          {/* Rack utilization visualization */}
          <div style={{ padding: '24px 28px 28px', minHeight: 260 }}>
            {datacenters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--c-text-sec)' }}>
                <Building2 size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
                <p style={{ fontSize: 15, fontWeight: 500 }}>No data centers configured</p>
                <p style={{ fontSize: 13, marginTop: 4 }}>Create a data center to see rack overview</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
                {datacenters.map(dc => (dc.racks || []).map(rack => {
                  const usedU = (rack.devices || []).reduce((s, d) => s + d.heightU, 0);
                  const pct = Math.round((usedU / rack.totalU) * 100);
                  return (
                    <div key={rack.id}
                      onClick={() => onSelectRack && onSelectRack(dc.id, rack.id)}
                      style={{
                        padding: 16, borderRadius: 10,
                        border: '1px solid var(--c-border)', background: 'var(--c-surface2)',
                        cursor: 'pointer', transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                        <Server size={14} style={{ color: 'var(--c-accent)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{rack.name}</span>
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginBottom: 8 }}>
                        {dc.name} · {(rack.devices || []).length} devices
                      </p>
                      <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, transition: 'width 0.3s',
                          width: `${pct}%`,
                          background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e'
                        }} />
                      </div>
                      <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginTop: 6, textAlign: 'right' }}>{pct}% used</p>
                    </div>
                  );
                }))}
              </div>
            )}
          </div>
        </div>

        {/* Right side Audit Log Timeline */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', height: '100%', minHeight: 382 }}>
          <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--c-text)' }}>
              Activity Log
            </span>
            <Activity size={16} style={{ color: 'var(--c-accent)' }} />
          </div>
          <div style={{ padding: '16px 20px', overflowY: 'auto', flex: 1, maxHeight: 310 }}>
            {logs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-sec)' }}>
                <Clock size={32} style={{ opacity: 0.2, marginBottom: 8, margin: '0 auto' }} />
                <p style={{ fontSize: 13 }}>No recent activity</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
                {/* Vertical timeline line */}
                <div style={{ position: 'absolute', left: 15, top: 8, bottom: 8, width: 2, background: 'var(--c-border)' }} />
                
                {logs.map((log) => {
                  const isCreate = log.actionType?.startsWith('CREATE');
                  const isDelete = log.actionType?.startsWith('DELETE');
                  const isUpdate = log.actionType?.startsWith('UPDATE');
                  
                  const bulletBg = isCreate ? 'rgba(34, 197, 94, 0.15)' 
                                   : isDelete ? 'rgba(239, 68, 68, 0.15)' 
                                   : 'rgba(59, 130, 246, 0.15)';
                  const bulletColor = isCreate ? '#22c55e' 
                                      : isDelete ? '#ef4444' 
                                      : '#3b82f6';
                  
                  const ActionIcon = isCreate ? Plus : isDelete ? Trash2 : Edit3;

                  const relativeTime = (() => {
                    const diffMs = Date.now() - new Date(log.timestamp).getTime();
                    const diffMin = Math.floor(diffMs / 60000);
                    if (diffMin < 1) return 'Just now';
                    if (diffMin < 60) return `${diffMin}m ago`;
                    const diffHr = Math.floor(diffMin / 60);
                    if (diffHr < 24) return `${diffHr}h ago`;
                    return new Date(log.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  })();

                  return (
                    <div key={log.id} style={{ display: 'flex', gap: 12, position: 'relative', zIndex: 1 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: bulletBg, color: bulletColor,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        <ActionIcon size={14} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, color: 'var(--c-text)', fontWeight: 550, lineHeight: '1.4', margin: 0 }}>
                          {log.details}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: 'var(--c-text-sec)' }}>
                            <User size={10} /> {log.username}
                          </span>
                          <span style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>·</span>
                          <span style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{relativeTime}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Device table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700 }}>Active Devices</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="table-tabs">
              {[
                { key: 'all', label: `All Devices` },
                { key: 'online', label: 'Online' },
                { key: 'warning', label: 'Warning' },
                { key: 'offline', label: 'Offline' },
              ].map(t => (
                <button key={t.key} className={`table-tab ${deviceTab === t.key ? 'active' : ''}`}
                  onClick={() => setDeviceTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
            <button className="filter-btn">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 120px', padding: '0 24px', borderBottom: '1px solid var(--c-border)' }}>
          <span className="table-col-header">Device Name</span>
          <span className="table-col-header">Current Status</span>
          <span className="table-col-header">Health Metrics</span>
          <span className="table-col-header" style={{ textAlign: 'right' }}>Actions</span>
        </div>

        {/* Rows */}
        <div style={{ padding: '0 24px' }}>
          {filteredDevices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--c-text-sec)' }}>
              <p style={{ fontSize: 14 }}>No devices to display</p>
              <p style={{ fontSize: 13, marginTop: 4 }}>Add devices in the Rack Editor to see them here</p>
            </div>
          ) : (
            currentDevices.map(dev => {
              const s = deviceStatus?.[dev.id] || {};
              const statusKey = s.status || dev.status || 'unknown';
              const dotClass = statusKey === 'online' ? 'green' : statusKey === 'warning' ? 'orange' : statusKey === 'error' ? 'red' : 'gray';
              const statusLabel = statusKey.charAt(0).toUpperCase() + statusKey.slice(1);
              const cpuVal = s.cpu ?? Math.floor(Math.random() * 60 + 20);
              const memVal = s.memory?.percent ?? Math.floor(Math.random() * 70 + 15);

              return (
                <div key={dev.id} className="table-row" style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 120px', alignItems: 'center' }}>
                  {/* Name */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'var(--c-surface2)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      fontSize: 16
                    }}>
                      🖥️
                    </div>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-text)' }}>{dev.name || 'Unnamed'}</p>
                      <p style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>{dev.dcName} / {dev.rackName}</p>
                    </div>
                  </div>

                  {/* Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span className={`status-dot ${dotClass}`} />
                    <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--c-text)' }}>{statusLabel}</span>
                    {dev.model && <span style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>{dev.model}</span>}
                  </div>

                  {/* Health */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {statusKey === 'online' ? (
                      <span className="status-badge ok">None Detected</span>
                    ) : statusKey === 'warning' ? (
                      <span className="status-badge warn">⚠ High Load</span>
                    ) : statusKey === 'error' ? (
                      <span className="status-badge error">● Critical</span>
                    ) : (
                      <span className="status-badge neutral">N/A</span>
                    )}
                  </div>

                  {/* Action */}
                  <div style={{ textAlign: 'right' }}>
                    <button className="action-btn" onClick={() => onSelectRack && onSelectRack(dev.dcId, dev.rackId)}>
                      View Rack
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {filteredDevices.length > 0 && (
          <div style={{
            padding: '14px 24px', borderTop: '1px solid var(--c-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            fontSize: 13, color: 'var(--c-text-sec)'
          }}>
            <span>Showing {(page - 1) * itemsPerPage + 1} - {Math.min(page * itemsPerPage, filteredDevices.length)} of {filteredDevices.length} devices</span>
            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <button className="filter-btn" 
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '5px 10px', opacity: page === 1 ? 0.3 : 1 }}>&lt;</button>
                
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className="filter-btn" 
                    style={{ 
                      padding: '5px 10px', 
                      background: page === i + 1 ? 'var(--c-text)' : 'transparent', 
                      color: page === i + 1 ? 'var(--c-primary)' : 'var(--c-text)', 
                      border: page === i + 1 ? 'none' : '1px solid var(--c-border)' 
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}

                <button className="filter-btn" 
                  disabled={page === totalPages}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  style={{ padding: '5px 10px', opacity: page === totalPages ? 0.3 : 1 }}>&gt;</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
