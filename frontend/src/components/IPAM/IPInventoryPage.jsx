import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { Search, Plus, List, Grid3X3, Filter, ChevronRight, Activity, Shield, Hash, Zap, ChevronDown, Settings, Trash2, Layout, X, FileDown, FileUp, MoreVertical, Edit2 } from 'lucide-react';
import AssignmentDrawer from './AssignmentDrawer';

const STATUS_COLORS = {
  free: { bg: '#f3f4f6', text: '#6b7280', label: 'Free' },
  used: { bg: '#dcfce7', text: '#166534', label: 'Used' },
  reserved: { bg: '#fef9c3', text: '#854d0e', label: 'Reserved' },
  conflict: { bg: '#fee2e2', text: '#991b1b', label: 'Conflict' },
  static: { bg: '#dbeafe', text: '#1e40af', label: 'Static' },
};

export default function IPInventoryPage() {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [subnets, setSubnets] = useState([]);
  const [selectedSubnet, setSelectedSubnet] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'grid'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal/Drawer states for adding subnet
  const [showAddSubnet, setShowAddSubnet] = useState(false);
  const [showAssignment, setShowAssignment] = useState(false);
  const [assignmentData, setAssignmentData] = useState(null);
  const [newSubnet, setNewSubnet] = useState({ name: '', cidr: '192.168.10.0/24', vlan: '', environment: 'Production' });
  const [expandedGroups, setExpandedGroups] = useState(new Set(['Production', 'UAT', 'Development']));
  const [environments, setEnvironments] = useState([]);
  const [showEnvEditor, setShowEnvEditor] = useState(false);
  const [expandedSubnetId, setExpandedSubnetId] = useState(null);
  const [hoverAddSubnet, setHoverAddSubnet] = useState(false);
  const [editingSubnetId, setEditingSubnetId] = useState(null);
  const [error, setError] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // stores subnet id to delete
  const [importQueue, setImportQueue] = useState([]);
  const [currentConflict, setCurrentConflict] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [importSummary, setImportSummary] = useState(null); // { added, updated }
  
  // New Env form
  const [newEnvName, setNewEnvName] = useState('');
  const [newEnvPurpose, setNewEnvPurpose] = useState('');

  useEffect(() => {
    fetchSubnets();
    fetchEnvironments();
  }, []);

  const fetchEnvironments = async () => {
    try {
      const res = await apiFetch('/environments');
      const data = await res.json();
      setEnvironments(data);
      if (data.length > 0 && !newSubnet.environment) {
        setNewSubnet(prev => ({ ...prev, environment: data[0].name }));
      }
    } catch (e) {}
  };

  const fetchSubnets = async () => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch(`/subnets?_t=${Date.now()}`);
      const data = await res.json();
      setSubnets(data);
      
      // Refresh current selected subnet data
      if (selectedSubnet) {
        const updated = data.find(s => s.id === selectedSubnet.id);
        if (updated) setSelectedSubnet(updated);
      } else if (data.length > 0) {
        setSelectedSubnet(data[0]);
      }
    } catch (e) {
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  };

  const handleIPClick = (ip) => {
    setAssignmentData({
      subnetId: selectedSubnet.id,
      address: ip.address,
      hostname: ip.hostname || '',
      fqdn: ip.fqdn || '',
      owner: ip.assignedTo || '',
      service: ip.service || '',
      environment: ip.environment || selectedSubnet.environment,
      status: ip.status
    });
    setShowAssignment(true);
  };

  const handleAddSubnet = async () => {
    if (!newSubnet.name || !newSubnet.cidr) return;
    setIsRefreshing(true);
    try {
      const res = await apiFetch('/subnets', {
        method: 'POST',
        body: JSON.stringify(newSubnet)
      });
      if (res.ok) {
        setShowAddSubnet(false);
        await fetchSubnets();
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create subnet');
      }
    } catch (e) {
      setError('System error');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleAddEnvironment = async () => {
    if (!newEnvName) return;
    try {
      const res = await apiFetch('/environments', {
        method: 'POST',
        body: JSON.stringify({ name: newEnvName, purpose: newEnvPurpose })
      });
      if (res.ok) {
        setNewEnvName('');
        setNewEnvPurpose('');
        fetchEnvironments();
      }
    } catch (e) {}
  };

  const deleteEnvironment = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this environment?', 'Delete Environment');
    if (!confirmed) return;
    await apiFetch(`/environments/${id}`, { method: 'DELETE' });
    fetchEnvironments();
  };

  const startEditSubnet = (s) => {
    setEditingSubnetId(s.id);
    setNewSubnet({ name: s.name, cidr: s.cidr, vlan: s.vlan || '', environment: s.environment || 'Production' });
    setShowAddSubnet(true);
  };

  const handleUpdateSubnet = async () => {
    if (!newSubnet.name) return;
    try {
      const res = await apiFetch(`/subnets/${editingSubnetId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: newSubnet.name, vlan: newSubnet.vlan, environment: newSubnet.environment })
      });
      if (res.ok) {
        setShowAddSubnet(false);
        setEditingSubnetId(null);
        fetchSubnets();
      }
    } catch (e) {}
  };

  const deleteSubnet = async () => {
    if (!showDeleteConfirm) return;
    await apiFetch(`/subnets/${showDeleteConfirm}`, { method: 'DELETE' });
    setShowDeleteConfirm(null);
    setShowAddSubnet(false);
    setEditingSubnetId(null);
    fetchSubnets();
  };

  const toggleSubnetExpand = (id) => {
    setExpandedSubnetId(prev => prev === id ? null : id);
  };

  const handleExportSubnet = () => {
    const dataStr = JSON.stringify(subnets, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `subnets_export_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const processImport = (data) => {
    const conflicts = [];
    const safeToImport = [];

    data.forEach(item => {
      // Normalize fields
      const cidr = (item.cidr || item.CIDR || '').trim();
      const name = (item.name || item.Name || '').trim();
      const vlan = item.vlan || item.VLAN || '';
      const environment = item.environment || item.Environment || 'Production';

      if (!cidr || !name) return;

      const importedIps = item.ips || item.IPs || [];
      const normalizedItem = { 
        cidr, 
        name, 
        vlan, 
        environment,
        ips: importedIps.map(ip => {
          const hostname = (ip.hostname || '').trim();
          let status = (ip.status || 'free').toLowerCase();
          // Auto-set used if hostname exists
          if (hostname && (status === 'free')) {
            status = 'used';
          }
          return { ...ip, hostname, status };
        })
      };
      const existing = subnets.find(s => s.cidr === cidr);
      
      if (existing) {
        conflicts.push({ imported: normalizedItem, existing });
      } else {
        safeToImport.push(normalizedItem);
      }
    });

    if (safeToImport.length > 0) {
      batchImport(safeToImport);
    }

    if (conflicts.length > 0) {
      setImportQueue(conflicts);
      setCurrentConflict(conflicts[0]);
    } else if (safeToImport.length > 0) {
      setImportSummary({ added: safeToImport.length, updated: 0 });
    }
  };

  const batchImport = async (list) => {
    setIsRefreshing(true);
    try {
      await apiFetch('/subnets/batch', {
        method: 'POST',
        body: JSON.stringify({ subnets: list })
      });
      await fetchSubnets();
    } catch (e) {}
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (Array.isArray(data)) {
          processImport(data);
        }
      } catch (err) {
        await showAlert('Invalid JSON file', 'Error');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  const resolveConflict = async (action) => {
    setIsRefreshing(true);
    try {
      const res = await apiFetch(`/subnets/${currentConflict.existing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: currentConflict.imported.name,
          vlan: currentConflict.imported.vlan,
          environment: currentConflict.imported.environment,
          ips: currentConflict.imported.ips
        })
      });
      if (res.ok) {
        // Find and update local state immediately if possible, or just wait for fetch
      }
    } catch (e) {}

    const nextQueue = importQueue.slice(1);
    setImportQueue(nextQueue);
    if (nextQueue.length > 0) {
      setCurrentConflict(nextQueue[0]);
    } else {
      setCurrentConflict(null);
      await fetchSubnets(); // Final refresh
    }
    setIsRefreshing(false);
  };

  const handleReplaceAll = async () => {
    const list = [...importQueue];
    setImportQueue([]);
    setCurrentConflict(null);
    setIsRefreshing(true);
    
    try {
      await apiFetch('/subnets/batch', {
        method: 'PUT',
        body: JSON.stringify({ 
          updates: list.map(c => ({
            id: c.existing.id,
            name: c.imported.name,
            vlan: c.imported.vlan,
            environment: c.imported.environment,
            ips: c.imported.ips
          }))
        })
      });
      await fetchSubnets();
      setImportSummary({ added: 0, updated: list.length });
    } catch (e) {
    } finally {
      setIsRefreshing(false);
    }
  };

  const filteredSubnets = subnets.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.cidr.includes(search) ||
    (s.vlan && s.vlan.toString().includes(search))
  );

  const ipToLong = (ip) => {
    return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
  };

  const sortedSubnets = [...filteredSubnets].sort((a, b) => {
    const ipA = a.cidr.split('/')[0];
    const ipB = b.cidr.split('/')[0];
    return ipToLong(ipA) - ipToLong(ipB);
  });

  const groupedSubnets = sortedSubnets.reduce((acc, s) => {
    const env = s.environment || 'Other';
    if (!acc[env]) acc[env] = [];
    acc[env].push(s);
    return acc;
  }, {});

  const toggleGroup = (env) => {
    const next = new Set(expandedGroups);
    if (next.has(env)) next.delete(env);
    else next.add(env);
    setExpandedGroups(next);
  };

  const calculateUtilization = (subnet) => {
    if (!subnet.ips) return 0;
    const used = subnet.ips.filter(ip => ip.status !== 'free').length;
    return Math.round((used / subnet.ips.length) * 100);
  };

  const filteredIPs = selectedSubnet?.ips?.filter(ip => 
    ip.address.includes(search) || 
    ip.hostname.toLowerCase().includes(search.toLowerCase()) ||
    ip.service.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (loading) return <div className="p-8">Loading IP Inventory...</div>;

  return (
    <div style={{ padding: '24px 32px', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div>
            <h2 style={{ fontSize: 24, fontWeight: 700, color: 'var(--c-text)' }}>IP Inventory</h2>
            <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginTop: 4 }}>Manage IP resources and subnet health</p>
          </div>
          {isRefreshing && (
            <div className="animate-pulse" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--c-surface2)', borderRadius: 20, border: '1px solid var(--c-border)' }}>
              <Activity size={14} className="animate-spin" />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-accent)' }}>Refreshing...</span>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-secondary" onClick={() => { setAssignmentData(null); setShowAssignment(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={18} /> IP Assign
          </button>
          
          <div style={{ position: 'relative' }} onMouseEnter={() => setHoverAddSubnet(true)} onMouseLeave={() => setHoverAddSubnet(false)}>
            <button className="btn-primary" onClick={() => { setEditingSubnetId(null); setNewSubnet({ name: '', cidr: '192.168.10.0/24', vlan: '', environment: environments[0]?.name || 'Production' }); setShowAddSubnet(true); }} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={18} /> Add Subnet
            </button>
            
            {hoverAddSubnet && (
              <div className="card shadow-lg animate-fade-down" style={{
                position: 'absolute', top: '100%', right: 0, zIndex: 100,
                minWidth: 160, padding: 8, marginTop: 8, background: 'var(--c-surface)',
                border: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', gap: 4
              }}>
                <button className="btn-secondary" onClick={() => document.getElementById('subnet-import').click()} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: 13, gap: 10, display: 'flex', alignItems: 'center' }}>
                  <FileUp size={14} /> Import Subnet
                </button>
                <button className="btn-secondary" onClick={handleExportSubnet} style={{ width: '100%', justifyContent: 'flex-start', border: 'none', padding: '8px 12px', fontSize: 13, gap: 10, display: 'flex', alignItems: 'center' }}>
                  <FileDown size={14} /> Export Subnet
                </button>
                <input type="file" id="subnet-import" style={{ display: 'none' }} accept=".json" onChange={handleImportFile} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24, flex: 1, minHeight: 0 }}>
        {/* Left: Subnet List */}
        <div style={{ width: 300, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px' }}>
            {Object.entries(groupedSubnets).map(([env, envSubnets]) => {
              const isExpanded = expandedGroups.has(env);
              return (
                <div key={env} style={{ marginBottom: 12 }}>
                  <div 
                    onClick={() => toggleGroup(env)}
                    style={{ 
                      display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', 
                      fontSize: 11, fontWeight: 800, color: 'var(--c-text-sec)', 
                      textTransform: 'uppercase', cursor: 'pointer', letterSpacing: '0.05em'
                    }}
                  >
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {env} ({envSubnets.length})
                  </div>

                  {isExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                      {envSubnets.map(s => {
                        const usage = calculateUtilization(s);
                        const isCompact = envSubnets.length > 10 && expandedSubnetId !== s.id;
                        const isSelected = selectedSubnet?.id === s.id;

                        if (isCompact) {
                          return (
                            <div 
                              key={s.id} 
                              onClick={() => { setSelectedSubnet(s); setExpandedSubnetId(s.id); }}
                              style={{ 
                                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                                background: isSelected ? 'var(--c-accent)' : 'var(--c-surface2)',
                                color: isSelected ? 'white' : 'var(--c-text)',
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                border: '1px solid var(--c-border)', transition: 'all 0.15s'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                                <Layout size={12} style={{ opacity: 0.6 }} />
                                <span style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.name}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.7 }}>{usage}%</span>
                                <Settings 
                                  size={12} 
                                  onClick={(e) => { e.stopPropagation(); startEditSubnet(s); }}
                                  style={{ opacity: 0.5, cursor: 'pointer' }}
                                  className="hover:opacity-100"
                                />
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={s.id} 
                            onClick={() => { setSelectedSubnet(s); if (envSubnets.length > 10) setExpandedSubnetId(s.id); }}
                            style={{ 
                              padding: '12px 16px', borderRadius: 12, cursor: 'pointer',
                              background: isSelected ? 'var(--c-accent)' : 'transparent',
                              color: isSelected ? 'white' : 'var(--c-text)',
                              transition: 'all 0.2s',
                              border: '1px solid',
                              borderColor: isSelected ? 'var(--c-accent)' : 'transparent',
                              position: 'relative'
                            }}
                            className={isSelected ? '' : 'hover:bg-gray-100'}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <span style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</span>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, opacity: 0.7, fontWeight: 700 }}>VLAN {s.vlan || '-'}</span>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={(e) => { e.stopPropagation(); startEditSubnet(s); }}
                                    style={{ background: 'none', border: 'none', color: isSelected ? 'white' : 'var(--c-text-sec)', padding: 2, cursor: 'pointer' }}>
                                    <Edit2 size={12} />
                                  </button>
                                </div>
                              </div>
                            </div>
                            <p style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>{s.cidr}</p>
                            
                            {/* Utilization Bar */}
                            <div style={{ marginTop: 8 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                                <span>Utilization</span>
                                <span>{usage}%</span>
                              </div>
                              <div style={{ height: 4, background: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ 
                                  width: `${usage}%`, height: '100%', 
                                  background: isSelected ? 'white' : (usage > 80 ? '#ef4444' : (usage > 50 ? '#f59e0b' : '#22c55e')),
                                  transition: 'width 0.5s ease-out'
                                }} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: IP Details */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {selectedSubnet ? (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
              {/* Tool Bar */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flex: 1 }}>
                  <div style={{ position: 'relative', width: 300 }}>
                    <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-sec)' }} />
                    <input 
                      type="text" className="form-input" placeholder="Search IP, Hostname..." 
                      style={{ paddingLeft: 36, margin: 0 }}
                      value={search} onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', background: 'var(--c-surface2)', borderRadius: 8, padding: 3 }}>
                    <button 
                      onClick={() => setViewMode('table')}
                      style={{ 
                        padding: '6px 12px', borderRadius: 6, border: 'none', 
                        background: viewMode === 'table' ? 'var(--c-surface)' : 'transparent',
                        color: viewMode === 'table' ? 'var(--c-accent)' : 'var(--c-text-sec)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
                        boxShadow: viewMode === 'table' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <List size={16} /> Table
                    </button>
                    <button 
                      onClick={() => setViewMode('grid')}
                      style={{ 
                        padding: '6px 12px', borderRadius: 6, border: 'none', 
                        background: viewMode === 'grid' ? 'var(--c-surface)' : 'transparent',
                        color: viewMode === 'grid' ? 'var(--c-accent)' : 'var(--c-text-sec)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 500,
                        boxShadow: viewMode === 'grid' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none'
                      }}
                    >
                      <Grid3X3 size={16} /> Grid
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn-secondary" style={{ padding: '8px 12px' }}><Filter size={16} /> Filter</button>
                </div>
              </div>

              {/* View Content */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
                {viewMode === 'table' ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--c-border)' }}>
                        <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>IP ADDRESS</th>
                        <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>STATUS</th>
                        <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>HOSTNAME</th>
                        <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>SERVICE / ENV</th>
                        <th style={{ padding: '12px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>UPDATED AT</th>
                        <th style={{ padding: '12px 8px' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIPs.map(ip => (
                        <tr key={ip.address} style={{ borderBottom: '1px solid var(--c-border)', transition: 'background 0.1s' }} className="hover:bg-gray-50">
                          <td style={{ 
                            padding: '14px 8px', fontSize: 14, fontWeight: 600, 
                            color: ip.status === 'free' ? 'var(--c-accent)' : 'inherit',
                            cursor: 'pointer',
                            textDecoration: 'underline'
                          }} onClick={() => handleIPClick(ip)}>
                            {ip.address}
                          </td>
                          <td style={{ padding: '14px 8px' }}>
                            <span style={{ 
                              fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6,
                              background: (STATUS_COLORS[ip.status] || STATUS_COLORS.free).bg, 
                              color: (STATUS_COLORS[ip.status] || STATUS_COLORS.free).text,
                              textTransform: 'uppercase'
                            }}>
                              {(STATUS_COLORS[ip.status] || STATUS_COLORS.free).label}
                            </span>
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: 14 }}>{ip.hostname || '-'}</td>
                          <td style={{ padding: '14px 8px' }}>
                            <div style={{ fontSize: 14 }}>{ip.service || '-'}</div>
                            <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{ip.environment}</div>
                          </td>
                          <td style={{ padding: '14px 8px', fontSize: 12, color: 'var(--c-text-sec)' }}>
                            {new Date(ip.updatedAt).toLocaleDateString()}
                          </td>
                          <td style={{ padding: '14px 8px', textAlign: 'right' }}>
                            <button className="icon-btn" title="Edit"><ChevronRight size={16} /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                      <div style={{ display: 'flex', gap: 16 }}>
                        {Object.entries(STATUS_COLORS).map(([key, val]) => (
                          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 12, height: 12, borderRadius: 3, background: val.bg, border: '1px solid rgba(0,0,0,0.05)' }} />
                            <span style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>{val.label}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>
                        Capacity: <span style={{ color: 'var(--c-text)', fontWeight: 600 }}>
                          {selectedSubnet.ips.filter(ip => ip.status !== 'free').length} / {selectedSubnet.ips.length}
                        </span>
                      </div>
                    </div>
                    <div style={{ 
                      display: 'grid', gridTemplateColumns: 'repeat(16, 1fr)', gap: 8,
                      padding: 20, background: 'var(--c-surface2)', borderRadius: 12
                    }}>
                      {selectedSubnet.ips.map(ip => (
                        <div 
                          key={ip.address} 
                          title={`${ip.address} - ${ip.status.toUpperCase()}${ip.hostname ? ` (${ip.hostname})` : ''}`}
                          style={{
                            aspectRatio: '1', borderRadius: 4, cursor: 'pointer', transition: 'all 0.2s',
                            background: (STATUS_COLORS[ip.status] || STATUS_COLORS.free).bg, border: '1px solid rgba(0,0,0,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
                            color: (STATUS_COLORS[ip.status] || STATUS_COLORS.free).text
                          }}
                          onClick={() => handleIPClick(ip)}
                          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.2)'}
                          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          {ip.address.split('.').pop()}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={48} style={{ color: 'var(--c-text-sec)', opacity: 0.2, marginBottom: 16 }} />
              <p style={{ color: 'var(--c-text-sec)' }}>Select a subnet to view IP inventory</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Subnet Modal */}
      {showAddSubnet && (
        <div className="modal-overlay" onClick={() => { setShowAddSubnet(false); setEditingSubnetId(null); setError(''); }}>
          <div className="modal-content animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>{editingSubnetId ? 'Edit Subnet' : 'Add New Subnet'}</h2>
              <button className="modal-close" onClick={() => { setShowAddSubnet(false); setEditingSubnetId(null); setError(''); }}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ padding: '10px 14px', background: '#fee2e2', color: '#b91c1c', borderRadius: 8, fontSize: 13, border: '1px solid #fecaca' }}>
                  {error}
                </div>
              )}
              <div>
                <label className="form-label">Subnet Name</label>
                <input className="form-input" value={newSubnet.name} onChange={e => setNewSubnet({...newSubnet, name: e.target.value})} placeholder="e.g. Management LAN" />
              </div>
              <div>
                <label className="form-label">CIDR Block</label>
                <input className="form-input" value={newSubnet.cidr} onChange={e => setNewSubnet({...newSubnet, cidr: e.target.value})} placeholder="192.168.10.0/24" disabled={!!editingSubnetId} />
                {!editingSubnetId && <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginTop: 4 }}>Currently supporting /24 ranges only</p>}
              </div>
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label">VLAN ID</label>
                  <input className="form-input" value={newSubnet.vlan} onChange={e => setNewSubnet({...newSubnet, vlan: e.target.value})} placeholder="100" />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label">Environment</label>
                  <select 
                    className="form-input" 
                    value={newSubnet.environment} 
                    onChange={e => {
                      if (e.target.value === 'ADD_NEW') {
                        setShowEnvEditor(true);
                      } else {
                        setNewSubnet({...newSubnet, environment: e.target.value});
                      }
                    }}
                  >
                    {environments.map(env => (
                      <option key={env.id} value={env.name}>{env.name}</option>
                    ))}
                    <option value="ADD_NEW">+ Add New Env</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  className="btn-primary" 
                  style={{ flex: 2 }} 
                  onClick={editingSubnetId ? handleUpdateSubnet : handleAddSubnet}
                >
                  {editingSubnetId ? 'Update Subnet' : 'Create Subnet'}
                </button>
                {editingSubnetId && (
                  <button 
                    className="btn-danger" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: '1px solid #fee2e2' }}
                    onClick={() => setShowDeleteConfirm(editingSubnetId)}
                  >
                    <Trash2 size={16} /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => setShowDeleteConfirm(null)}>
          <div className="modal-content animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 360 }}>
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', color: '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <Trash2 size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Delete Subnet?</h3>
              <p style={{ fontSize: 14, color: 'var(--c-text-sec)', lineHeight: 1.5 }}>
                Are you sure you want to delete this subnet? This will permanently remove all associated IP data.
              </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)', display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setShowDeleteConfirm(null)}>Cancel</button>
              <button className="btn-primary" style={{ flex: 1, background: '#ef4444', borderColor: '#ef4444' }} onClick={deleteSubnet}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Environment Editor Modal */}
      {showEnvEditor && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowEnvEditor(false)}>
          <div className="modal-content animate-scale" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(79,110,247,0.1)', color: 'var(--c-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Settings size={20} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Manage Environments</h2>
              </div>
              <button className="modal-close" onClick={() => setShowEnvEditor(false)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              {/* Existing Envs List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
                <label className="form-label" style={{ fontSize: 11, fontWeight: 800 }}>Existing Environments</label>
                {environments.map(env => (
                  <div key={env.id} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                    padding: '12px 16px', background: 'var(--c-surface2)', borderRadius: 12, border: '1px solid var(--c-border)'
                  }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{env.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>{env.purpose || 'No purpose defined'}</p>
                    </div>
                    <button className="btn-danger" onClick={() => deleteEnvironment(env.id)} style={{ padding: 8, height: 'auto' }} title="Delete">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add New Env Form */}
              <div style={{ padding: 20, background: 'var(--c-surface2)', borderRadius: 16, border: '1px solid var(--c-border)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Add New Environment</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label className="form-label">Environment Name</label>
                    <input className="form-input" value={newEnvName} onChange={e => setNewEnvName(e.target.value)} placeholder="e.g. Staging" />
                  </div>
                  <div>
                    <label className="form-label">Purpose</label>
                    <input className="form-input" value={newEnvPurpose} onChange={e => setNewEnvPurpose(e.target.value)} placeholder="e.g. External testing" />
                  </div>
                  <button className="btn-primary" onClick={handleAddEnvironment} style={{ marginTop: 4 }}>Add Environment</button>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px' }}>
              <button className="btn-primary" onClick={() => setShowEnvEditor(false)} style={{ width: '100%' }}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Import Conflict Modal */}
      {currentConflict && (
        <div className="modal-overlay" style={{ zIndex: 1300 }}>
          <div className="modal-content animate-scale" style={{ maxWidth: 450 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Hash size={20} />
                </div>
                <h2 style={{ fontSize: 18, fontWeight: 700 }}>Import Conflict</h2>
              </div>
            </div>
            <div className="modal-body" style={{ padding: 24 }}>
              <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginBottom: 20 }}>
                The CIDR <strong style={{ color: 'var(--c-text)' }}>{currentConflict.imported.cidr}</strong> already exists. 
                What would you like to do?
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 12, background: 'var(--c-surface2)', borderRadius: 10, border: '1px solid var(--c-border)' }}>
                  <p style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase', marginBottom: 4 }}>Existing</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{currentConflict.existing.name}</p>
                  <p style={{ fontSize: 11 }}>{currentConflict.existing.environment}</p>
                </div>
                <div style={{ padding: 12, background: 'rgba(34,197,94,0.05)', borderRadius: 10, border: '1px solid #22c55e' }}>
                  <p style={{ fontSize: 11, color: '#166534', textTransform: 'uppercase', marginBottom: 4 }}>Imported</p>
                  <p style={{ fontSize: 13, fontWeight: 700 }}>{currentConflict.imported.name}</p>
                  <p style={{ fontSize: 11 }}>{currentConflict.imported.environment}</p>
                </div>
              </div>

              <p style={{ fontSize: 12, color: 'var(--c-text-sec)', marginTop: 20 }}>
                Remaining conflicts: {importQueue.length - 1}
              </p>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', display: 'flex', gap: 12 }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => resolveConflict('skip')}>Skip</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={() => resolveConflict('replace')}>Replace</button>
              {importQueue.length > 1 && (
                <button className="btn-primary" style={{ flex: 1.5, background: 'var(--c-accent)' }} onClick={handleReplaceAll}>
                  Replace All ({importQueue.length})
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Import Success Modal */}
      {importSummary && (
        <div className="modal-overlay" style={{ zIndex: 1400 }}>
          <div className="modal-content animate-scale" style={{ maxWidth: 360 }}>
            <div style={{ padding: '32px 24px', textAlign: 'center' }}>
              <div style={{ 
                width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', color: '#166534',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px'
              }}>
                <Shield size={28} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Import Complete</h3>
              <p style={{ fontSize: 14, color: 'var(--c-text-sec)', lineHeight: 1.5 }}>
                {importSummary.added > 0 && <div>Successfully added <strong>{importSummary.added}</strong> new subnets.</div>}
                {importSummary.updated > 0 && <div>Successfully updated <strong>{importSummary.updated}</strong> existing subnets.</div>}
                {importSummary.added === 0 && importSummary.updated === 0 && <div>No changes were made to the inventory.</div>}
              </p>
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--c-border)' }}>
              <button className="btn-primary" style={{ width: '100%' }} onClick={() => setImportSummary(null)}>Great!</button>
            </div>
          </div>
        </div>
      )}

      <AssignmentDrawer 
        isOpen={showAssignment} 
        onClose={() => setShowAssignment(false)} 
        subnets={subnets}
        onComplete={fetchSubnets}
        initialData={assignmentData}
      />
    </div>
  );
}
