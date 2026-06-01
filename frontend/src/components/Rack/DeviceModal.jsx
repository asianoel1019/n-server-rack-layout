import { useState, useEffect } from 'react';
import { X, Trash2, Save, Server, ChevronDown, ChevronRight, AlertTriangle, Check, Shield } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DEVICE_TYPES, DEVICE_CATEGORIES } from '../../utils/deviceTypes';

export default function DeviceModal({ device, isNew, dcId, rackId, onSave, onDelete, onClose }) {
  const { apiFetch } = useAuth();
  const [form, setForm] = useState({
    name: '', type: 'server', model: '', serialNumber: '',
    ipAddress: '', managementIp: '', startU: 1, heightU: 1,
    snmpCommunity: 'public', sshUser: '', sshPass: '',
    nodeCount: 1, nodes: [],
    powerWatts: 0, weightKg: 0,
    portCount: 24,
  });
  const [tab, setTab] = useState(device?.defaultTab || 'general');
  const [expandedCat, setExpandedCat] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [datacenters, setDatacenters] = useState([]);
  const [notification, setNotification] = useState(null); // { type, title, message }
  const [connections, setConnections] = useState([]);
  const [activePortConnect, setActivePortConnect] = useState(null);
  const [connectTargetDevId, setConnectTargetDevId] = useState('');
  const [connectTargetPort, setConnectTargetPort] = useState('');
  const [cableType, setCableType] = useState('CAT6');
  const [cableColor, setCableColor] = useState('#3b82f6');
  const [connLoading, setConnLoading] = useState(false);
  const [contracts, setContracts] = useState([]);

  const getDevicePorts = (type, count) => {
    const finalCount = parseInt(count) || (type === 'switch' ? 24 : type === 'router' ? 8 : 5);
    return Array.from({ length: finalCount }, (_, i) => `Port ${i + 1}`);
  };

  useEffect(() => {
    if (device && device.id) {
      apiFetch('/connections').then(res => res.json()).then(setConnections).catch(console.error);
    }
  }, [device]);

  useEffect(() => {
    apiFetch('/datacenters').then(res => res.json()).then(setDatacenters).catch(console.error);
    apiFetch('/contracts').then(res => res.json()).then(setContracts).catch(console.error);
  }, []);

  useEffect(() => {
    if (device) {
      const initialForm = {
        name: device.name || '', type: device.type || 'server',
        model: device.model || '', serialNumber: device.serialNumber || '',
        ipAddress: device.ipAddress || '', managementIp: device.managementIp || '',
        startU: device.startU || 1, heightU: device.heightU || 1,
        snmpCommunity: device.snmpCommunity || 'public',
        sshUser: device.sshUser || '', sshPass: device.sshPass || '',
        nodeCount: device.nodeCount || 1,
        nodes: device.nodes || [],
        powerWatts: device.powerWatts || 0,
        weightKg: device.weightKg || 0,
        portCount: device.portCount || (device.type === 'switch' ? 24 : device.type === 'router' ? 8 : 5),
      };
      setForm(initialForm);
      
      if (device.defaultTab) {
        setTab(device.defaultTab);
      }
      
      // Auto-expand the category of the existing device
      const cat = DEVICE_TYPES[device.type]?.category;
      if (cat) setExpandedCat(cat);
    } else {
      // Default expand for new device
      setExpandedCat(DEVICE_CATEGORIES[0]);
    }
  }, [device]);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSave = () => {
    onSave({ 
      ...device, 
      ...form, 
      heightU: parseInt(form.heightU) || 1, 
      startU: parseInt(form.startU) || 1,
      powerWatts: parseInt(form.powerWatts) || 0,
      weightKg: parseInt(form.weightKg) || 0,
      portCount: parseInt(form.portCount) || (form.type === 'switch' ? 24 : form.type === 'router' ? 8 : 5)
    });
  };

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'network', label: 'Network' },
    { id: 'monitoring', label: 'Monitoring' },
    ...(!isNew ? [{ id: 'ports', label: 'Ports & Cables' }] : []),
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content animate-fade" style={{ maxWidth: 640 }}>
        {/* Header */}
        <div className="modal-header">
          <h2>{isNew ? 'Add Device' : `Edit: ${device?.name || 'Device'}`}</h2>
          <button className="modal-close" onClick={onClose}><X size={18} /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--c-border)', padding: '0 24px' }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: '12px 16px', fontSize: 14, fontWeight: 500,
              border: 'none', background: 'none', cursor: 'pointer',
              color: tab === t.id ? 'var(--c-accent)' : 'var(--c-text-sec)',
              borderBottom: tab === t.id ? '2px solid var(--c-accent)' : '2px solid transparent',
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {tab === 'general' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Category Selection Row */}
              <div>
                <label className="form-label" style={{ marginBottom: 10, display: 'block' }}>Device Category</label>
                <div style={{ 
                  display: 'flex', 
                  gap: 4, 
                  background: 'var(--c-surface2)', 
                  padding: 4, 
                  borderRadius: 10,
                  border: '1px solid var(--c-border)',
                  marginBottom: 16
                }}>
                  {DEVICE_CATEGORIES.map(cat => (
                    <button 
                      key={cat}
                      onClick={() => setExpandedCat(cat)}
                      style={{
                        flex: 1,
                        padding: '8px 4px',
                        fontSize: 11,
                        fontWeight: 600,
                        border: 'none',
                        borderRadius: 7,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        background: expandedCat === cat ? 'var(--c-surface)' : 'transparent',
                        color: expandedCat === cat ? 'var(--c-accent)' : 'var(--c-text-sec)',
                        boxShadow: expandedCat === cat ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Items for selected category */}
                <div className="animate-fade" style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(4, 1fr)', 
                  gap: 10,
                  minHeight: 80 
                }}>
                  {Object.entries(DEVICE_TYPES)
                    .filter(([_, dt]) => dt.category === expandedCat)
                    .map(([key, dt]) => (
                      <button key={key} onClick={() => {
                        update('type', key);
                        update('heightU', dt.defaultHeight);
                        if (dt.isMultiNode && (!form.nodes || form.nodes.length === 0)) {
                          update('nodes', [{ 
                            name: `${form.name || 'Device'} Node-1`, 
                            model: '', 
                            serialNumber: '', 
                            ipAddress: '', 
                            managementIp: '',
                            snmpCommunity: 'public',
                            sshUser: '',
                            sshPass: ''
                          }]);
                          update('nodeCount', 1);
                        }
                      }} style={{
                        padding: '12px 8px', borderRadius: 10,
                        border: `2px solid ${form.type === key ? 'var(--c-accent)' : 'var(--c-border)'}`,
                        background: form.type === key ? 'rgba(79,110,247,0.06)' : 'var(--c-surface2)',
                        cursor: 'pointer', textAlign: 'center', transition: 'all 0.15s',
                      }}>
                        <span style={{ fontSize: 22, display: 'block', marginBottom: 4 }}>{dt.icon}</span>
                        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text)' }}>{dt.label}</span>
                      </button>
                    ))}
                </div>
              </div>

              {DEVICE_TYPES[form.type]?.isMultiNode && (
                <div style={{ background: 'rgba(79,110,247,0.04)', padding: 16, borderRadius: 10, border: '1px solid rgba(79,110,247,0.1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                    <h3 style={{ fontSize: 13, fontWeight: 700 }}>Nodes Configuration</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>Node Count:</span>
                      <input 
                        type="number" min="1" max="16" className="form-input" 
                        style={{ width: 60, padding: '4px 8px' }}
                        value={form.nodeCount} 
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          update('nodeCount', val);
                          const newNodes = [...(form.nodes || [])];
                          if (newNodes.length < val) {
                            for (let i = newNodes.length; i < val; i++) {
                              newNodes.push({ 
                                name: `${form.name || 'Device'} Node-${i+1}`, 
                                model: '', 
                                serialNumber: '', 
                                ipAddress: '', 
                                managementIp: '',
                                snmpCommunity: 'public',
                                sshUser: '',
                                sshPass: ''
                              });
                            }
                          } else {
                            newNodes.length = val;
                          }
                          update('nodes', newNodes);
                        }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(form.nodes || []).map((node, idx) => (
                      <div key={idx} style={{ 
                        display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 8, 
                        background: 'var(--c-surface)', padding: 10, borderRadius: 8,
                        border: '1px solid var(--c-border)'
                      }}>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>Node Name</label>
                          <input 
                            className="form-input" style={{ fontSize: 12, padding: '6px 8px' }} 
                            value={node.name} 
                            onChange={e => {
                              const newNodes = [...form.nodes];
                              newNodes[idx].name = e.target.value;
                              update('nodes', newNodes);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>Model</label>
                          <input 
                            className="form-input" style={{ fontSize: 12, padding: '6px 8px' }} 
                            value={node.model} 
                            onChange={e => {
                              const newNodes = [...form.nodes];
                              newNodes[idx].model = e.target.value;
                              update('nodes', newNodes);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>Serial Number (SN)</label>
                          <input 
                            className="form-input" style={{ fontSize: 12, padding: '6px 8px' }} 
                            value={node.serialNumber} 
                            onChange={e => {
                              const newNodes = [...form.nodes];
                              newNodes[idx].serialNumber = e.target.value;
                              update('nodes', newNodes);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Name</label>
                  <input className="form-input" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g. Web-Server-01" />
                </div>
                <div>
                  <label className="form-label">Model</label>
                  <input className="form-input" value={form.model} onChange={e => update('model', e.target.value)} placeholder="e.g. Dell R740" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">Serial Number</label>
                  <input className="form-input" value={form.serialNumber} onChange={e => update('serialNumber', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Start U</label>
                  <input className="form-input" type="number" min="1" value={form.startU} onChange={e => update('startU', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">Height (U)</label>
                  <input className="form-input" type="number" min="1" max="10" value={form.heightU} onChange={e => update('heightU', e.target.value)} />
                </div>
              </div>

              {DEVICE_TYPES[form.type]?.category === 'Others' ? (
                <div>
                  <label className="form-label">Weight (kg)</label>
                  <input className="form-input" type="number" min="0" value={form.weightKg} onChange={e => update('weightKg', e.target.value)} placeholder="e.g. 15" />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="form-label">Power Draw (Watts)</label>
                    <input className="form-input" type="number" min="0" value={form.powerWatts} onChange={e => update('powerWatts', e.target.value)} placeholder="e.g. 350" />
                  </div>
                  <div>
                    <label className="form-label">Weight (kg)</label>
                    <input className="form-input" type="number" min="0" value={form.weightKg} onChange={e => update('weightKg', e.target.value)} placeholder="e.g. 15" />
                  </div>
                  <div>
                    <label className="form-label">Port Count</label>
                    <input className="form-input" type="number" min="1" max="100" value={form.portCount} onChange={e => update('portCount', e.target.value)} placeholder="e.g. 24" />
                  </div>
                </div>
              )}

              {/* Warranty / Contracts Coverage */}
              {device && device.id && (
                <div style={{ 
                  marginTop: 10,
                  padding: 14, 
                  borderRadius: 10, 
                  background: 'var(--c-surface2)', 
                  border: '1px solid var(--c-border)' 
                }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, color: 'var(--c-text)' }}>
                    <Shield size={14} style={{ color: 'var(--c-accent)' }} /> Warranty & Support Contracts
                  </h4>
                  
                  {(() => {
                    const devContracts = contracts.filter(c => c.deviceIds?.includes(device.id));
                    if (devContracts.length === 0) {
                      return (
                        <p style={{ margin: 0, fontSize: 11, color: 'var(--c-text-sec)' }}>
                          No warranty or support contracts currently linked to this device.
                        </p>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {devContracts.map(c => {
                          const today = new Date();
                          const end = new Date(c.endDate);
                          const isExpired = today > end;
                          const statusColor = isExpired ? '#ef4444' : (end - today <= 30 * 24 * 60 * 60 * 1000) ? '#f59e0b' : '#22c55e';
                          
                          return (
                            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--c-surface)', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--c-border)' }}>
                              <div>
                                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)' }}>{c.name}</span>
                                <span style={{ fontSize: 10, color: 'var(--c-text-sec)', marginLeft: 8 }}>({c.contractNo})</span>
                              </div>
                              <span style={{ 
                                fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                                background: `${statusColor}18`, color: statusColor, border: `1px solid ${statusColor}33`
                              }}>
                                {isExpired ? 'Expired' : `Expires ${c.endDate}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {tab === 'network' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">IP Address</label>
                <input className="form-input" value={form.ipAddress} onChange={e => update('ipAddress', e.target.value)} placeholder="e.g. 192.168.1.100" />
              </div>
              <div>
                <label className="form-label">iLO / IPMI Address</label>
                <input className="form-input" value={form.managementIp} onChange={e => update('managementIp', e.target.value)} placeholder="e.g. 192.168.1.200" />
              </div>

              {DEVICE_TYPES[form.type]?.isMultiNode && (
                <div style={{ marginTop: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Node Network Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(form.nodes || []).map((node, idx) => (
                      <div key={idx} style={{ 
                        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, 
                        background: 'var(--c-surface2)', padding: 10, borderRadius: 8,
                        border: '1px solid var(--c-border)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600 }}>{node.name}</span>
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-sec)' }}>Node IP</label>
                          <input 
                            className="form-input" style={{ fontSize: 12, padding: '4px 8px' }} 
                            value={node.ipAddress} 
                            onChange={e => {
                              const newNodes = [...form.nodes];
                              newNodes[idx].ipAddress = e.target.value;
                              update('nodes', newNodes);
                            }}
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-sec)' }}>Node iLO/IPMI</label>
                          <input 
                            className="form-input" style={{ fontSize: 12, padding: '4px 8px' }} 
                            value={node.managementIp} 
                            onChange={e => {
                              const newNodes = [...form.nodes];
                              newNodes[idx].managementIp = e.target.value;
                              update('nodes', newNodes);
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'monitoring' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="form-label">SNMP Community</label>
                <input className="form-input" value={form.snmpCommunity} onChange={e => update('snmpCommunity', e.target.value)} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="form-label">SSH Username</label>
                  <input className="form-input" value={form.sshUser} onChange={e => update('sshUser', e.target.value)} />
                </div>
                <div>
                  <label className="form-label">SSH Password</label>
                  <input className="form-input" type="password" value={form.sshPass} onChange={e => update('sshPass', e.target.value)} />
                </div>
              </div>

              {DEVICE_TYPES[form.type]?.isMultiNode && (
                <div style={{ marginTop: 8 }}>
                  <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Node Monitoring Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {(form.nodes || []).map((node, idx) => (
                      <div key={idx} style={{ 
                        display: 'flex', flexDirection: 'column', gap: 8, 
                        background: 'var(--c-surface2)', padding: 10, borderRadius: 8,
                        border: '1px solid var(--c-border)'
                      }}>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>{node.name}</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-sec)' }}>SNMP</label>
                            <input 
                              className="form-input" style={{ fontSize: 11, padding: '4px 8px' }} 
                              value={node.snmpCommunity} 
                              onChange={e => {
                                const newNodes = [...form.nodes];
                                newNodes[idx].snmpCommunity = e.target.value;
                                update('nodes', newNodes);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-sec)' }}>SSH User</label>
                            <input 
                              className="form-input" style={{ fontSize: 11, padding: '4px 8px' }} 
                              value={node.sshUser} 
                              onChange={e => {
                                const newNodes = [...form.nodes];
                                newNodes[idx].sshUser = e.target.value;
                                update('nodes', newNodes);
                              }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: 9, fontWeight: 700, color: 'var(--c-text-sec)' }}>SSH Pass</label>
                            <input 
                              className="form-input" type="password" style={{ fontSize: 11, padding: '4px 8px' }} 
                              value={node.sshPass} 
                              onChange={e => {
                                const newNodes = [...form.nodes];
                                newNodes[idx].sshPass = e.target.value;
                                update('nodes', newNodes);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'ports' && (() => {
            const allOtherDevices = [];
            datacenters.forEach(dc => {
              (dc.racks || []).forEach(r => {
                (r.devices || []).forEach(d => {
                  if (d.id !== device.id) {
                    allOtherDevices.push({
                      ...d,
                      rackName: r.name,
                      dcName: dc.name
                    });
                  }
                });
              });
            });

            const groupedDevices = {};
            allOtherDevices.forEach(d => {
              const cat = DEVICE_TYPES[d.type]?.category || 'Others';
              if (!groupedDevices[cat]) groupedDevices[cat] = [];
              groupedDevices[cat].push(d);
            });

            const selectedTargetDev = allOtherDevices.find(d => d.id === connectTargetDevId);
            const targetPorts = selectedTargetDev ? getDevicePorts(selectedTargetDev.type, selectedTargetDev.portCount) : [];
            const occupiedPorts = connections.map(c => {
              if (c.fromDeviceId === connectTargetDevId) return c.fromPort;
              if (c.toDeviceId === connectTargetDevId) return c.toPort;
              return null;
            }).filter(Boolean);
            const availableTargetPorts = targetPorts.filter(p => !occupiedPorts.includes(p));

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700 }}>Port Configuration & Cabling</h3>
                  <span style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>Type: {device.type.toUpperCase()}</span>
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                  {getDevicePorts(form.type, form.portCount).map(portName => {
                    const conn = connections.find(c => 
                      (c.fromDeviceId === device.id && c.fromPort === portName) ||
                      (c.toDeviceId === device.id && c.toPort === portName)
                    );
                    
                    const isConnectingThis = activePortConnect === portName;
                    
                    return (
                      <div key={portName} style={{ 
                        padding: 12, borderRadius: 10, border: '1px solid var(--c-border)',
                        background: isConnectingThis ? 'rgba(79, 110, 247, 0.05)' : 'var(--c-surface2)',
                        display: 'flex', flexDirection: 'column', gap: 8,
                        borderColor: isConnectingThis ? 'var(--c-accent)' : 'var(--c-border)',
                        transition: 'all 0.2s'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{portName}</span>
                          {conn ? (
                            <span style={{ 
                              fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 12,
                              background: `${conn.cableColor}22`, color: conn.cableColor, border: `1px solid ${conn.cableColor}44`
                            }}>
                              {conn.cableType}
                            </span>
                          ) : (
                            <span style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>Unconnected</span>
                          )}
                        </div>

                        {conn ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <p style={{ fontSize: 12, color: 'var(--c-text-sec)', margin: 0 }}>
                              Connected to:
                            </p>
                            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', margin: 0 }}>
                              {conn.fromDeviceId === device.id ? conn.toDeviceName : conn.fromDeviceName} [{conn.fromDeviceId === device.id ? conn.toPort : conn.fromPort}]
                            </p>
                            <button 
                              className="btn-danger" 
                              style={{ padding: '4px 8px', fontSize: 11, width: 'fit-content', marginTop: 4 }}
                              onClick={async () => {
                                try {
                                  const res = await apiFetch(`/connections/${conn.id}`, { method: 'DELETE' });
                                  if (res.ok) {
                                    setConnections(connections.filter(c => c.id !== conn.id));
                                  }
                                } catch (e) {
                                  console.error('Failed to delete connection', e);
                                }
                              }}
                            >
                              Disconnect
                            </button>
                          </div>
                        ) : isConnectingThis ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
                            <div>
                              <label style={{ fontSize: 11, color: 'var(--c-text-sec)', display: 'block', marginBottom: 4 }}>Target Device</label>
                              <select 
                                className="form-input" 
                                style={{ padding: 6, fontSize: 12 }}
                                value={connectTargetDevId} 
                                onChange={e => {
                                  setConnectTargetDevId(e.target.value);
                                  setConnectTargetPort('');
                                }}
                              >
                                <option value="">-- Select Target --</option>
                                {Object.entries(groupedDevices).map(([catName, devList]) => (
                                  <optgroup key={catName} label={catName}>
                                    {devList.map(d => (
                                      <option key={d.id} value={d.id}>{d.name} ({d.rackName})</option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                            </div>

                            {connectTargetDevId && (
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--c-text-sec)', display: 'block', marginBottom: 4 }}>Target Port</label>
                                <select 
                                  className="form-input" 
                                  style={{ padding: 6, fontSize: 12 }}
                                  value={connectTargetPort} 
                                  onChange={e => setConnectTargetPort(e.target.value)}
                                >
                                  <option value="">-- Select Port --</option>
                                  {availableTargetPorts.map(p => (
                                    <option key={p} value={p}>{p}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--c-text-sec)', display: 'block', marginBottom: 4 }}>Cable Type</label>
                                <select 
                                  className="form-input" 
                                  style={{ padding: 6, fontSize: 12 }}
                                  value={cableType} 
                                  onChange={e => setCableType(e.target.value)}
                                >
                                  <option value="CAT6">CAT6</option>
                                  <option value="SFP+">SFP+</option>
                                  <option value="OM4">Fiber OM4</option>
                                  <option value="DAC">DAC Copper</option>
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: 11, color: 'var(--c-text-sec)', display: 'block', marginBottom: 4 }}>Color</label>
                                <div style={{ display: 'flex', gap: 6, alignItems: 'center', height: 32 }}>
                                  {['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#111827'].map(c => (
                                    <button 
                                      key={c} 
                                      onClick={() => setCableColor(c)}
                                      style={{
                                        width: 18, height: 18, borderRadius: '50%', background: c, border: cableColor === c ? '2px solid #fff' : 'none',
                                        cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', padding: 0
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                              <button 
                                className="btn-primary" 
                                style={{ padding: '6px 12px', fontSize: 11 }}
                                disabled={!connectTargetDevId || !connectTargetPort || connLoading}
                                onClick={async () => {
                                  setConnLoading(true);
                                  const targetDev = allOtherDevices.find(d => d.id === connectTargetDevId);
                                  try {
                                    const res = await apiFetch('/connections', {
                                      method: 'POST',
                                      body: JSON.stringify({
                                        fromDeviceId: device.id,
                                        fromDeviceName: device.name,
                                        fromPort: portName,
                                        toDeviceId: connectTargetDevId,
                                        toDeviceName: targetDev.name,
                                        toPort: connectTargetPort,
                                        cableType,
                                        cableColor
                                      })
                                    });
                                    if (res.ok) {
                                      const newC = await res.json();
                                      setConnections([...connections, newC]);
                                      setActivePortConnect(null);
                                      setConnectTargetDevId('');
                                      setConnectTargetPort('');
                                    }
                                  } catch (e) {
                                    console.error(e);
                                  }
                                  setConnLoading(false);
                                }}
                              >
                                Save
                              </button>
                              <button 
                                className="btn-secondary" 
                                style={{ padding: '6px 12px', fontSize: 11 }}
                                onClick={() => {
                                  setActivePortConnect(null);
                                  setConnectTargetDevId('');
                                  setConnectTargetPort('');
                                }}
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '4px 8px', fontSize: 11, width: 'fit-content', marginTop: 4 }}
                            onClick={() => {
                              setActivePortConnect(portName);
                              setConnectTargetDevId('');
                              setConnectTargetPort('');
                            }}
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          {!isNew && (
            <>
              <button className="btn-danger" onClick={() => onDelete(device.id)} style={{ marginRight: 8 }}>
                <Trash2 size={14} style={{ marginRight: 4 }} /> Delete
              </button>
              <button className="btn-secondary" onClick={() => setShowIssueModal(true)} style={{ marginRight: 'auto', borderColor: '#f59e0b', color: '#f59e0b' }}>
                <AlertTriangle size={14} style={{ marginRight: 4 }} /> Report Issue
              </button>
            </>
          )}
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Save size={14} /> {isNew ? 'Add Device' : 'Save Changes'}
          </button>
        </div>

        {showIssueModal && (
          <IssueReportModal 
            device={device}
            dc={datacenters.find(d => d.id === dcId)}
            rack={datacenters.find(d => d.id === dcId)?.racks?.find(r => r.id === rackId)}
            onClose={() => setShowIssueModal(false)}
            onSubmit={async (issueData) => {
              try {
                await apiFetch('/hardware-issues', {
                  method: 'POST',
                  body: JSON.stringify({
                    ...issueData,
                    deviceId: device.id,
                    dcId,
                    rackId
                  })
                });
                setShowIssueModal(false);
                setNotification({
                  type: 'success',
                  title: 'Success',
                  message: 'The hardware issue has been reported successfully.'
                });
              } catch (e) {
                setNotification({
                  type: 'error',
                  title: 'Failed',
                  message: 'Could not submit the hardware issue report.'
                });
              }
            }}
          />
        )}

        {notification && (
          <NotificationModal 
            {...notification}
            onClose={() => {
              const wasSuccess = notification.type === 'success';
              setNotification(null);
              if (wasSuccess) onClose();
            }}
          />
        )}
      </div>
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
          {type === 'success' ? <Check size={32} /> : <X size={32} />}
        </div>
        <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--c-text-sec)', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <button className="btn-primary" style={{ width: '100%' }} onClick={onClose}>Great</button>
      </div>
    </div>
  );
}

function IssueReportModal({ device, dc, rack, onClose, onSubmit }) {
  const [form, setForm] = useState({
    urgency: 'Medium',
    failedParts: '',
    partsInfo: '',
    processNote: ''
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 110 }}>
      <div className="modal-content animate-slide-up" style={{ width: 500, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle color="#f59e0b" /> Report Hardware Issue
        </h2>
        
        <div style={{ background: 'var(--c-surface2)', padding: 16, borderRadius: 10, marginBottom: 20, fontSize: 13 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div><span style={{ color: 'var(--c-text-sec)' }}>IDC:</span> {dc?.name}</div>
            <div><span style={{ color: 'var(--c-text-sec)' }}>Rack:</span> {rack?.name}</div>
            <div><span style={{ color: 'var(--c-text-sec)' }}>U Position:</span> {device.startU}U</div>
            <div><span style={{ color: 'var(--c-text-sec)' }}>Device:</span> {device.name}</div>
            <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--c-text-sec)' }}>Serial:</span> {device.serialNumber}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Urgency</label>
            <select className="form-input" value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
              <option>Critical</option>
            </select>
          </div>
          <div>
            <label className="form-label">Failed Parts</label>
            <input className="form-input" value={form.failedParts} onChange={e => setForm({...form, failedParts: e.target.value})} placeholder="e.g. Disk, Power Supply, Memory" />
          </div>
          <div>
            <label className="form-label">Parts Information</label>
            <input className="form-input" value={form.partsInfo} onChange={e => setForm({...form, partsInfo: e.target.value})} placeholder="e.g. 1.2TB SAS 10K, 750W Platinum" />
          </div>
          <div>
            <label className="form-label">Initial Process Note</label>
            <textarea className="form-input" style={{ height: 80, resize: 'none' }} value={form.processNote} onChange={e => setForm({...form, processNote: e.target.value})} placeholder="Describe the issue symptoms..." />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSubmit({
            ...form,
            idc: dc?.name,
            rack: rack?.name,
            u: device.startU,
            deviceName: device.name,
            serialNumber: device.serialNumber
          })}>Submit Report</button>
          <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
