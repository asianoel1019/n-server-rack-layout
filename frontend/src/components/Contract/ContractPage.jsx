import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { 
  FileText, Shield, Plus, Edit, Trash2, Search, Calendar, DollarSign,
  AlertTriangle, CheckCircle, ShieldAlert, Laptop, X, FileSignature
} from 'lucide-react';

export default function ContractPage() {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  
  const [contracts, setContracts] = useState([]);
  const [datacenters, setDatacenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [typeFilter, setTypeFilter] = useState('All');

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [form, setForm] = useState({
    contractNo: '', name: '', provider: '', type: 'Warranty',
    startDate: '', endDate: '', cost: '', description: '',
    deviceIds: []
  });

  const fetchData = async () => {
    try {
      const [contractsRes, dcsRes] = await Promise.all([
        apiFetch('/contracts'),
        apiFetch('/datacenters')
      ]);
      setContracts(await contractsRes.json());
      setDatacenters(await dcsRes.json());
    } catch (e) {
      console.error('Failed to fetch contracts data', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getContractStatus = (endDate) => {
    const today = new Date();
    const end = new Date(endDate);
    if (today > end) return 'Expired';
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 30) return 'Expiring Soon';
    return 'Active';
  };

  // Flatten all devices across all datacenters & racks
  const allDevices = [];
  datacenters.forEach(dc => {
    (dc.racks || []).forEach(r => {
      (r.devices || []).forEach(d => {
        allDevices.push({
          ...d,
          rackName: r.name,
          dcName: dc.name
        });
      });
    });
  });

  const getDeviceMap = () => {
    const map = {};
    allDevices.forEach(d => {
      map[d.id] = d;
    });
    return map;
  };
  const deviceMap = getDeviceMap();

  const handleOpenAdd = () => {
    setEditingContract(null);
    setForm({
      contractNo: `CON-${new Date().getFullYear()}-${String(contracts.length + 1).padStart(3, '0')}`,
      name: '', provider: '', type: 'Warranty',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      cost: '', description: '', deviceIds: []
    });
    setShowFormModal(true);
  };

  const handleOpenEdit = (contract) => {
    setEditingContract(contract);
    setForm({
      contractNo: contract.contractNo,
      name: contract.name,
      provider: contract.provider,
      type: contract.type,
      startDate: contract.startDate,
      endDate: contract.endDate,
      cost: contract.cost,
      description: contract.description,
      deviceIds: contract.deviceIds || []
    });
    setShowFormModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.contractNo || !form.name || !form.provider || !form.startDate || !form.endDate) {
      await showAlert('Please fill in all required fields.', 'Validation Error');
      return;
    }

    try {
      const method = editingContract ? 'PUT' : 'POST';
      const url = editingContract ? `/contracts/${editingContract.id}` : '/contracts';
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setShowFormModal(false);
        fetchData();
      } else {
        const err = await res.json();
        await showAlert(err.error || 'Failed to save contract', 'Error');
      }
    } catch (e) {
      await showAlert('Failed to save contract', 'Error');
    }
  };

  const handleDelete = async (id, name) => {
    const confirmed = await showConfirm(`Are you sure you want to delete contract "${name}"?`, 'Delete Contract');
    if (!confirmed) return;
    
    try {
      const res = await apiFetch(`/contracts/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchData();
      } else {
        await showAlert('Failed to delete contract', 'Error');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const toggleDeviceSelection = (deviceId) => {
    setForm(prev => {
      const deviceIds = prev.deviceIds.includes(deviceId)
        ? prev.deviceIds.filter(id => id !== deviceId)
        : [...prev.deviceIds, deviceId];
      return { ...prev, deviceIds };
    });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  // Calculate Metrics
  const activeCount = contracts.filter(c => getContractStatus(c.endDate) === 'Active').length;
  const expiringCount = contracts.filter(c => getContractStatus(c.endDate) === 'Expiring Soon').length;
  const expiredCount = contracts.filter(c => getContractStatus(c.endDate) === 'Expired').length;
  const totalCost = contracts
    .filter(c => getContractStatus(c.endDate) !== 'Expired')
    .reduce((sum, c) => sum + (parseFloat(c.cost) || 0), 0);

  // Filter Contracts
  const filteredContracts = contracts.filter(c => {
    const status = getContractStatus(c.endDate);
    const matchesStatus = statusFilter === 'All' || status === statusFilter;
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    const matchesSearch = !searchQuery ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.contractNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.provider.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="animate-fade" style={{ padding: '24px 32px' }}>
      {/* Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileSignature size={24} style={{ color: 'var(--c-accent)' }} />
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: 'var(--c-text)' }}>Contract & Warranty Management</h1>
        </div>
        <button className="btn-primary" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Plus size={16} /> Add Contract
        </button>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Active Cost Coverage</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <DollarSign size={18} style={{ color: '#22c55e' }} /> ${totalCost.toLocaleString()}
          </h3>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Active Contracts</p>
          <h3 style={{ margin: '8px 0 0', fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle size={18} style={{ color: '#22c55e' }} /> {activeCount}
          </h3>
        </div>
        <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: 18 }}>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>Expiring Soon (30d)</p>
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
      </div>

      {/* Toolbar / Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: 1, minWidth: 260, position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-sec)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 38 }} 
            placeholder="Search by contract name, number, or vendor..." 
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

        {/* Type Filter dropdown */}
        <select 
          className="form-input" 
          style={{ width: 160, padding: '6px 12px', fontSize: 12 }}
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
        >
          <option value="All">All Types</option>
          <option value="Warranty">Warranty</option>
          <option value="Maintenance">Maintenance</option>
          <option value="SLA Support">SLA Support</option>
        </select>
      </div>

      {/* Contracts Cards Grid */}
      {filteredContracts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 0', border: '1px dashed var(--c-border)', borderRadius: 12, background: 'var(--c-surface)' }}>
          <div style={{ textAlign: 'center', color: 'var(--c-text-sec)' }}>
            <FileText size={48} style={{ opacity: 0.2, marginBottom: 12, margin: '0 auto' }} />
            <p style={{ margin: 0 }}>No contracts match the filters.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 20 }}>
          {filteredContracts.map(c => {
            const status = getContractStatus(c.endDate);
            const statusColor = status === 'Active' ? '#22c55e' : status === 'Expiring Soon' ? '#f59e0b' : '#ef4444';
            const coveredCount = c.deviceIds?.length || 0;
            
            // Calculate time progress bar
            const start = new Date(c.startDate);
            const end = new Date(c.endDate);
            const today = new Date();
            const totalDur = end - start;
            const elapsed = today - start;
            const pct = totalDur > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDur) * 100))) : 100;

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
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 12, background: 'rgba(255,255,255,0.05)', color: 'var(--c-text-sec)', textTransform: 'uppercase' }}>
                      {c.type}
                    </span>
                    <h3 style={{ margin: '6px 0 2px', fontSize: 15, fontWeight: 700, color: 'var(--c-text)' }}>{c.name}</h3>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)' }}>{c.contractNo} · {c.provider}</p>
                  </div>
                  
                  {/* Status Badge */}
                  <span style={{
                    fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4,
                    background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33`
                  }}>
                    {status}
                  </span>
                </div>

                {/* Description */}
                {c.description && (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {c.description}
                  </p>
                )}

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text-sec)', marginBottom: 4 }}>
                    <span>Duration Timeline</span>
                    <span>{pct}% Elapsed</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--c-surface2)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: statusColor, transition: 'width 0.3s' }} />
                  </div>
                </div>

                {/* Details Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--c-border)', paddingTop: 12, marginTop: 4 }}>
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--c-text-sec)', display: 'block' }}>Cost</span>
                      <strong style={{ fontSize: 12 }}>${c.cost ? parseFloat(c.cost).toLocaleString() : '0'}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--c-text-sec)', display: 'block' }}>Devices</span>
                      <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Laptop size={12} /> {coveredCount}
                      </strong>
                    </div>
                    <div>
                      <span style={{ fontSize: 10, color: 'var(--c-text-sec)', display: 'block' }}>Expires</span>
                      <strong style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={12} /> {c.endDate}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn-secondary" style={{ padding: '6px 8px' }} onClick={() => handleOpenEdit(c)}>
                      <Edit size={14} />
                    </button>
                    <button className="btn-danger" style={{ padding: '6px 8px' }} onClick={() => handleDelete(c.id, c.name)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
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
              <h2>{editingContract ? 'Edit Contract' : 'Add Contract'}</h2>
              <button className="modal-close" onClick={() => setShowFormModal(false)}><X size={18} /></button>
            </div>
            
            <form onSubmit={handleSave}>
              <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Contract Number *</label>
                    <input 
                      className="form-input" 
                      value={form.contractNo} 
                      onChange={e => setForm({ ...form, contractNo: e.target.value })} 
                      placeholder="e.g. CON-2026-001"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Contract Name *</label>
                    <input 
                      className="form-input" 
                      value={form.name} 
                      onChange={e => setForm({ ...form, name: e.target.value })} 
                      placeholder="e.g. Server Warranty Upgrade"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Provider / Vendor *</label>
                    <input 
                      className="form-input" 
                      value={form.provider} 
                      onChange={e => setForm({ ...form, provider: e.target.value })} 
                      placeholder="e.g. Dell Technologies"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Type *</label>
                    <select 
                      className="form-input" 
                      value={form.type} 
                      onChange={e => setForm({ ...form, type: e.target.value })}
                    >
                      <option value="Warranty">Warranty</option>
                      <option value="Maintenance">Maintenance</option>
                      <option value="SLA Support">SLA Support</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Start Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.startDate} 
                      onChange={e => setForm({ ...form, startDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">End Date *</label>
                    <input 
                      type="date" 
                      className="form-input" 
                      value={form.endDate} 
                      onChange={e => setForm({ ...form, endDate: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Cost ($)</label>
                    <input 
                      type="number" 
                      min="0" 
                      className="form-input" 
                      value={form.cost} 
                      onChange={e => setForm({ ...form, cost: e.target.value })} 
                      placeholder="e.g. 5000"
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Description / SLA Details</label>
                  <textarea 
                    className="form-input" 
                    style={{ height: 60, resize: 'none' }}
                    value={form.description} 
                    onChange={e => setForm({ ...form, description: e.target.value })} 
                    placeholder="Provide details about support coverage..."
                  />
                </div>

                {/* Covered Devices Multi-Select */}
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: 8 }}>Covered Devices ({form.deviceIds.length} Selected)</label>
                  <div style={{ 
                    maxHeight: 180, overflowY: 'auto', border: '1px solid var(--c-border)', 
                    borderRadius: 8, background: 'var(--c-surface)', padding: 12,
                    display: 'flex', flexDirection: 'column', gap: 8
                  }}>
                    {allDevices.length === 0 ? (
                      <p style={{ margin: 0, fontSize: 12, color: 'var(--c-text-sec)', textAlign: 'center' }}>No devices available to link.</p>
                    ) : (
                      allDevices.map(d => {
                        const isChecked = form.deviceIds.includes(d.id);
                        return (
                          <div 
                            key={d.id} 
                            onClick={() => toggleDeviceSelection(d.id)}
                            style={{ 
                              display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', 
                              borderRadius: 6, background: isChecked ? 'rgba(79, 110, 247, 0.05)' : 'transparent',
                              border: `1px solid ${isChecked ? 'rgba(79, 110, 247, 0.2)' : 'transparent'}`,
                              cursor: 'pointer', transition: 'all 0.15s'
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => {}} // handled by div onClick
                              style={{ cursor: 'pointer' }}
                            />
                            <div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)' }}>{d.name}</span>
                              <span style={{ fontSize: 11, color: 'var(--c-text-sec)', marginLeft: 8 }}>
                                ({d.dcName} · {d.rackName} · U{d.startU})
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
              
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingContract ? 'Save Changes' : 'Create Contract'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
