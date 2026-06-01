import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { Plus, Trash2, Server, X, Check, Building2, ArrowRight, Pencil, Zap, Package, ShieldCheck, User, Phone, Trash } from 'lucide-react';

export default function DataCenterList({ onSelectRack, onNavigateSpareParts }) {
  const { apiFetch } = useAuth();
  const { showConfirm } = useModal();
  const [dcs, setDcs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // DC states
  const [newDcName, setNewDcName] = useState('');
  const [newDcLoc, setNewDcLoc] = useState('');
  const [newDcPhone, setNewDcPhone] = useState('');
  const [newDcContact, setNewDcContact] = useState('');
  const [showAddDc, setShowAddDc] = useState(false);
  
  const [editingDc, setEditingDc] = useState(null);
  const [editDcName, setEditDcName] = useState('');
  const [editDcLoc, setEditDcLoc] = useState('');
  const [editDcPhone, setEditDcPhone] = useState('');
  const [editDcContact, setEditDcContact] = useState('');

  // Rack states
  const [addingRack, setAddingRack] = useState(null);
  const [newRackName, setNewRackName] = useState('');
  const [newRackU, setNewRackU] = useState(42);
  const [newRackFloor, setNewRackFloor] = useState('');
  const [newRackAmps, setNewRackAmps] = useState('');
  const [newRackVolts, setNewRackVolts] = useState('');

  const [editingRack, setEditingRack] = useState(null);
  const [editRackName, setEditRackName] = useState('');
  const [editRackU, setEditRackU] = useState(42);
  const [editRackFloor, setEditRackFloor] = useState('');
  const [editRackAmps, setEditRackAmps] = useState('');
  const [editRackVolts, setEditRackVolts] = useState('');

  // Access List states
  const [editingAccessListDc, setEditingAccessListDc] = useState(null);
  const [tempAccessList, setTempAccessList] = useState([]);
  const [hoveredDcId, setHoveredDcId] = useState(null);

  const fetchDcs = async () => {
    try {
      const res = await apiFetch('/datacenters');
      setDcs(await res.json());
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchDcs(); }, [apiFetch]);

  const addDc = async () => {
    if (!newDcName.trim()) return;
    await apiFetch('/datacenters', { 
      method: 'POST', 
      body: JSON.stringify({ name: newDcName, location: newDcLoc, phone: newDcPhone, contact: newDcContact }) 
    });
    setNewDcName(''); setNewDcLoc(''); setNewDcPhone(''); setNewDcContact(''); setShowAddDc(false);
    fetchDcs();
  };

  const startEditDc = (dc) => {
    setEditingDc(dc.id);
    setEditDcName(dc.name);
    setEditDcLoc(dc.location || '');
    setEditDcPhone(dc.phone || '');
    setEditDcContact(dc.contact || '');
  };

  const updateDc = async () => {
    if (!editDcName.trim()) return;
    await apiFetch(`/datacenters/${editingDc}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editDcName, location: editDcLoc, phone: editDcPhone, contact: editDcContact })
    });
    setEditingDc(null);
    fetchDcs();
  };

  const deleteDc = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this data center and all its racks?', 'Delete Data Center');
    if (!confirmed) return;
    await apiFetch(`/datacenters/${id}`, { method: 'DELETE' });
    fetchDcs();
  };

  const startEditAccessList = (dc) => {
    setEditingAccessListDc(dc);
    setTempAccessList(dc.accessList || []);
  };

  const saveAccessList = async () => {
    await apiFetch(`/datacenters/${editingAccessListDc.id}`, {
      method: 'PUT',
      body: JSON.stringify({ accessList: tempAccessList })
    });
    setEditingAccessListDc(null);
    fetchDcs();
  };

  const addAccessEntry = () => {
    setTempAccessList([...tempAccessList, { id: Date.now(), name: '', phone: '', role: 'user' }]);
  };

  const updateAccessEntry = (id, field, value) => {
    setTempAccessList(tempAccessList.map(entry => entry.id === id ? { ...entry, [field]: value } : entry));
  };

  const removeAccessEntry = (id) => {
    setTempAccessList(tempAccessList.filter(entry => entry.id !== id));
  };

  const addRack = async (dcId) => {
    if (!newRackName.trim()) return;
    await apiFetch(`/datacenters/${dcId}/racks`, { 
      method: 'POST', 
      body: JSON.stringify({ 
        name: newRackName, 
        totalU: newRackU,
        floor: newRackFloor,
        powerAmps: newRackAmps,
        voltageVolts: newRackVolts
      }) 
    });
    setAddingRack(null); setNewRackName(''); setNewRackU(42); setNewRackFloor(''); setNewRackAmps(''); setNewRackVolts('');
    fetchDcs();
  };

  const startEditRack = (rack) => {
    setEditingRack(rack.id);
    setEditRackName(rack.name);
    setEditRackU(rack.totalU);
    setEditRackFloor(rack.floor || '');
    setEditRackAmps(rack.powerAmps || '');
    setEditRackVolts(rack.voltageVolts || '');
  };

  const updateRack = async (dcId) => {
    if (!editRackName.trim()) return;
    await apiFetch(`/datacenters/${dcId}/racks/${editingRack}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: editRackName,
        totalU: editRackU,
        floor: editRackFloor,
        powerAmps: editRackAmps,
        voltageVolts: editRackVolts
      })
    });
    setEditingRack(null);
    fetchDcs();
  };

  const deleteRack = async (dcId, rackId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this rack and all its devices?', 'Delete Rack');
    if (!confirmed) return;
    await apiFetch(`/datacenters/${dcId}/racks/${rackId}`, { method: 'DELETE' });
    fetchDcs();
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div />
        {!showAddDc && (
          <button className="btn-secondary" onClick={() => setShowAddDc(true)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px' }}>
            <Plus size={16} /> Add Data Center
          </button>
        )}
      </div>

      {/* Add DC form */}
      {showAddDc && (
        <div className="card animate-fade" style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>New Data Center</h3>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">Name *</label>
              <input className="form-input" value={newDcName} onChange={e => setNewDcName(e.target.value)} placeholder="e.g. DC-Taipei-01" autoFocus />
            </div>
            <div style={{ flex: '1 1 200px' }}>
              <label className="form-label">Location</label>
              <input className="form-input" value={newDcLoc} onChange={e => setNewDcLoc(e.target.value)} placeholder="e.g. Taipei, Taiwan" />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label">Phone</label>
              <input className="form-input" value={newDcPhone} onChange={e => setNewDcPhone(e.target.value)} placeholder="e.g. +886..." />
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <label className="form-label">Contact</label>
              <input className="form-input" value={newDcContact} onChange={e => setNewDcContact(e.target.value)} placeholder="e.g. Noel" />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={addDc} style={{ padding: '10px 16px' }} title="Save"><Check size={18} /></button>
              <button className="btn-secondary" onClick={() => setShowAddDc(false)} style={{ padding: '10px 16px' }} title="Cancel"><X size={18} /></button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {dcs.length === 0 && !showAddDc && (
        <div className="card" style={{ textAlign: 'center', padding: '60px 0' }}>
          <Building2 size={48} style={{ color: 'var(--c-text-sec)', opacity: 0.3, marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-text)' }}>No Data Centers</p>
          <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginTop: 6 }}>Create your first data center to get started</p>
        </div>
      )}

      {/* DC list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {dcs.map(dc => (
          <div key={dc.id} className="card animate-fade" style={{ padding: 0, overflow: 'hidden' }}>
            {/* DC Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '18px 24px', borderBottom: '1px solid var(--c-border)'
            }}>
              {editingDc === dc.id ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flex: 1, marginRight: 20 }}>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Name</label>
                    <input className="form-input" value={editDcName} onChange={e => setEditDcName(e.target.value)} autoFocus />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Location</label>
                    <input className="form-input" value={editDcLoc} onChange={e => setEditDcLoc(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Phone</label>
                    <input className="form-input" value={editDcPhone} onChange={e => setEditDcPhone(e.target.value)} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="form-label" style={{ fontSize: 11 }}>Contact</label>
                    <input className="form-input" value={editDcContact} onChange={e => setEditDcContact(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn-primary" onClick={updateDc} style={{ padding: '8px 12px' }}><Check size={16} /></button>
                    <button className="btn-secondary" onClick={() => setEditingDc(null)} style={{ padding: '8px 12px' }}><X size={16} /></button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>{dc.name}</h3>
                    <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                      {dc.location && <p style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>{dc.location}</p>}
                      {dc.contact && <p style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>👤 {dc.contact}</p>}
                      {dc.phone && <p style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>☎ {dc.phone}</p>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button className="btn-secondary" style={{ padding: '7px 12px' }} 
                      onClick={() => { setAddingRack(dc.id); setNewRackName(''); setNewRackU(42); setNewRackFloor(''); }}
                      title="Add Rack">
                      <Plus size={16} />
                    </button>
                    <div style={{ position: 'relative' }} 
                         onMouseEnter={() => setHoveredDcId(dc.id)} 
                         onMouseLeave={() => setHoveredDcId(null)}>
                      <button className="btn-secondary" style={{ padding: '7px 12px' }} 
                        onClick={() => startEditAccessList(dc)}
                        title="Access List">
                        <ShieldCheck size={14} />
                      </button>
                      
                      {hoveredDcId === dc.id && (dc.accessList || []).length > 0 && (
                        <div className="card shadow-lg animate-fade" style={{
                          position: 'absolute', top: '100%', right: 0, zIndex: 100,
                          minWidth: 260, padding: 12, marginTop: 8, background: 'var(--c-surface)',
                          border: '1px solid var(--c-border)', pointerEvents: 'none'
                        }}>
                          <h4 style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, color: 'var(--c-text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Access List Preview
                          </h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {dc.accessList.map((entry, idx) => (
                              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 0', borderBottom: idx === dc.accessList.length - 1 ? 'none' : '1px solid var(--c-border-subtle)' }}>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.name || 'Unnamed'}</div>
                                  <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{entry.phone}</div>
                                </div>
                                <span style={{ 
                                  fontSize: 10, padding: '2px 6px', borderRadius: 4, 
                                  background: entry.role === 'admin' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                  color: entry.role === 'admin' ? '#ef4444' : '#3b82f6',
                                  fontWeight: 700, textTransform: 'uppercase'
                                }}>
                                  {entry.role}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="btn-secondary" onClick={() => onNavigateSpareParts(dc.id)} style={{ padding: '7px 12px' }} title="Spare Parts">
                      <Package size={14} />
                    </button>
                    <button className="btn-secondary" onClick={() => startEditDc(dc)} style={{ padding: '7px 12px' }} title="Edit">
                      <Pencil size={14} />
                    </button>
                    <button className="btn-danger" onClick={() => deleteDc(dc.id)} style={{ padding: '7px 12px' }} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Add rack form */}
            {addingRack === dc.id && (
              <div style={{ padding: '16px 24px', background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2 }}>
                    <label className="form-label">Rack Name</label>
                    <input className="form-input" value={newRackName} onChange={e => setNewRackName(e.target.value)} placeholder="e.g. Rack-A01" autoFocus />
                  </div>
                  <div style={{ width: 80 }}>
                    <label className="form-label">Floor</label>
                    <input className="form-input" value={newRackFloor} onChange={e => setNewRackFloor(e.target.value)} placeholder="3F" />
                  </div>
                  <div style={{ width: 90 }}>
                    <label className="form-label">Size (U)</label>
                    <input className="form-input" type="number" min="1" max="100" value={newRackU} onChange={e => setNewRackU(parseInt(e.target.value))} />
                  </div>
                  <div style={{ width: 70 }}>
                    <label className="form-label">Amps</label>
                    <input className="form-input" value={newRackAmps} onChange={e => setNewRackAmps(e.target.value)} placeholder="32" />
                  </div>
                  <div style={{ width: 70 }}>
                    <label className="form-label">Volts</label>
                    <input className="form-input" value={newRackVolts} onChange={e => setNewRackVolts(e.target.value)} placeholder="220" />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" onClick={() => addRack(dc.id)} style={{ padding: '10px 12px' }}><Check size={16} /></button>
                    <button className="btn-secondary" onClick={() => setAddingRack(null)} style={{ padding: '10px 12px' }}><X size={16} /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Edit rack form */}
            {editingRack && (dc.racks || []).some(r => r.id === editingRack) && (
              <div style={{ padding: '16px 24px', background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <div style={{ flex: 2 }}>
                    <label className="form-label">Rack Name</label>
                    <input className="form-input" value={editRackName} onChange={e => setEditRackName(e.target.value)} autoFocus />
                  </div>
                  <div style={{ width: 80 }}>
                    <label className="form-label">Floor</label>
                    <input className="form-input" value={editRackFloor} onChange={e => setEditRackFloor(e.target.value)} />
                  </div>
                  <div style={{ width: 90 }}>
                    <label className="form-label">Size (U)</label>
                    <input className="form-input" type="number" min="1" max="100" value={editRackU} onChange={e => setEditRackU(parseInt(e.target.value))} />
                  </div>
                  <div style={{ width: 70 }}>
                    <label className="form-label">Amps</label>
                    <input className="form-input" value={editRackAmps} onChange={e => setEditRackAmps(e.target.value)} />
                  </div>
                  <div style={{ width: 70 }}>
                    <label className="form-label">Volts</label>
                    <input className="form-input" value={editRackVolts} onChange={e => setEditRackVolts(e.target.value)} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-primary" onClick={() => updateRack(dc.id)} style={{ padding: '10px 12px' }}><Check size={16} /></button>
                    <button className="btn-secondary" onClick={() => setEditingRack(null)} style={{ padding: '10px 12px' }}><X size={16} /></button>
                  </div>
                </div>
              </div>
            )}

            {/* Racks grid */}
            <div style={{ padding: 20 }}>
              {(dc.racks || []).length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {dc.racks.map(rack => {
                    const usedU = (rack.devices || []).reduce((s, d) => s + d.heightU, 0);
                    const pct = Math.round((usedU / rack.totalU) * 100);
                    const hasPower = rack.powerAmps || rack.voltageVolts;
                    
                    return (
                      <div key={rack.id}
                        onClick={() => onSelectRack(dc.id, rack.id)}
                        style={{
                          padding: 18, borderRadius: 10,
                          border: '1px solid var(--c-border)', background: 'var(--c-surface2)',
                          cursor: 'pointer', transition: 'all 0.15s', position: 'relative'
                        }}
                        className="group"
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--c-accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--c-border)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Server size={16} style={{ color: 'var(--c-accent)' }} />
                            <span style={{ fontSize: 14, fontWeight: 600 }}>{rack.name}</span>
                            <Zap size={14} style={{ 
                              color: hasPower ? '#f59e0b' : 'var(--c-text-sec)', 
                              opacity: hasPower ? 1 : 0.2,
                              fill: hasPower ? '#f59e0b' : 'transparent'
                            }} />
                          </div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={(e) => { e.stopPropagation(); startEditRack(rack); }}
                              className="btn-secondary"
                              style={{ padding: '4px 8px' }}
                              title="Edit Rack">
                              <Pencil size={12} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); deleteRack(dc.id, rack.id); }}
                              className="btn-danger"
                              style={{ padding: '4px 8px' }}
                              title="Delete Rack">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--c-text-sec)', marginBottom: 10 }}>
                          {rack.floor ? `${rack.floor} · ` : ''}{rack.totalU}U · {(rack.devices || []).length} devices
                        </p>
                        {hasPower && (
                          <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginBottom: 10, display: 'flex', gap: 8 }}>
                            {rack.powerAmps && <span>{rack.powerAmps}A</span>}
                            {rack.voltageVolts && <span>{rack.voltageVolts}V</span>}
                          </p>
                        )}
                        <div style={{ height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3, transition: 'width 0.3s',
                            width: `${pct}%`,
                            background: pct > 80 ? '#ef4444' : pct > 50 ? '#f59e0b' : '#22c55e'
                          }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                          <span style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{pct}% capacity</span>
                          <ArrowRight size={13} style={{ color: 'var(--c-text-sec)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ fontSize: 14, color: 'var(--c-text-sec)', textAlign: 'center', padding: '20px 0' }}>
                  No racks yet. Add a rack to get started.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Access List Modal */}
      {editingAccessListDc && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div className="card animate-scale" style={{ width: '100%', maxWidth: 600, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 18, fontWeight: 700 }}>Access List - {editingAccessListDc.name}</h3>
                <p style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Manage personnel authorized to access this data center</p>
              </div>
              <button className="btn-secondary" onClick={() => setEditingAccessListDc(null)} style={{ padding: 8 }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: 24, maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {tempAccessList.map((entry) => (
                  <div key={entry.id} style={{ 
                    display: 'flex', gap: 12, alignItems: 'center', padding: 16, 
                    background: 'var(--c-surface2)', borderRadius: 12, border: '1px solid var(--c-border)'
                  }}>
                    <div style={{ flex: 2 }}>
                      <label className="form-label">Name</label>
                      <input className="form-input" value={entry.name} onChange={e => updateAccessEntry(entry.id, 'name', e.target.value)} placeholder="Full Name" />
                    </div>
                    <div style={{ flex: 2 }}>
                      <label className="form-label">Phone</label>
                      <input className="form-input" value={entry.phone} onChange={e => updateAccessEntry(entry.id, 'phone', e.target.value)} placeholder="Phone Number" />
                    </div>
                    <div style={{ width: 100 }}>
                      <label className="form-label">Role</label>
                      <select className="form-input" value={entry.role} onChange={e => updateAccessEntry(entry.id, 'role', e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <button className="btn-danger" onClick={() => removeAccessEntry(entry.id)} style={{ marginTop: 22, padding: 8 }} title="Remove">
                      <Trash size={16} />
                    </button>
                  </div>
                ))}
                
                <button className="btn-secondary" onClick={addAccessEntry} style={{ 
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, 
                  padding: 12, borderStyle: 'dashed', borderWidth: 2
                }}>
                  <Plus size={16} /> Add Person
                </button>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button className="btn-secondary" onClick={() => setEditingAccessListDc(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveAccessList}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .icon-btn-hover:hover { opacity: 1 !important; color: var(--c-accent) !important; }
      `}</style>
    </div>
  );
}
