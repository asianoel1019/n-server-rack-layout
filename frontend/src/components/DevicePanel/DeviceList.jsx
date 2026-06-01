import { useState, useEffect } from 'react';
import { DEVICE_TYPES, DEVICE_CATEGORIES } from '../../utils/deviceTypes';
import { useDraggable } from '@dnd-kit/core';
import { GripVertical, Monitor, Search, Play, RefreshCw, Compass } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function DraggableDevice({ type, dt, isCollapsed }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { type: 'new-device', deviceType: type },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8,
        cursor: 'grab', transition: 'all 0.15s',
        border: '1px solid transparent',
        opacity: isDragging ? 0.4 : 1,
        background: isDragging ? 'var(--c-surface2)' : 'none',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        overflow: 'hidden'
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.background = 'var(--c-surface2)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}}
      onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}}
    >
      <GripVertical size={14} style={{ color: 'var(--c-text-sec)', flexShrink: 0, display: isCollapsed ? 'none' : 'block' }} />
      <span style={{ fontSize: 20, flexShrink: 0 }}>{dt.icon}</span>
      
      {!isCollapsed && (
        <>
          <div style={{ flex: 1, minWidth: 0, animation: 'fadeIn 0.2s ease-out' }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{dt.label}</p>
            <p style={{ fontSize: 11, color: 'var(--c-text-sec)', margin: '2px 0 0' }}>{dt.defaultHeight}U</p>
          </div>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: dt.color, flexShrink: 0 }} />
        </>
      )}
    </div>
  );
}

function DraggableDiscoveredDevice({ device, isCollapsed }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `disc-${device.id}`,
    data: { type: 'discovered-device', deviceData: device },
  });

  const dt = DEVICE_TYPES[device.type] || DEVICE_TYPES['server'];

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 8,
        cursor: 'grab', transition: 'all 0.15s',
        border: '1px solid transparent',
        opacity: isDragging ? 0.4 : 1,
        background: isDragging ? 'var(--c-surface2)' : 'none',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
        marginBottom: 8,
        borderBottom: '1px solid var(--c-border)'
      }}
      onMouseEnter={e => { if (!isDragging) { e.currentTarget.style.background = 'var(--c-surface2)'; e.currentTarget.style.borderColor = 'var(--c-border)'; }}}
      onMouseLeave={e => { if (!isDragging) { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = 'transparent'; }}}
    >
      <GripVertical size={14} style={{ color: 'var(--c-text-sec)', flexShrink: 0, display: isCollapsed ? 'none' : 'block' }} />
      <span style={{ fontSize: 20, flexShrink: 0 }}>{dt.icon}</span>
      
      {!isCollapsed && (
        <div style={{ flex: 1, minWidth: 0, animation: 'fadeIn 0.2s ease-out' }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{device.name}</p>
          <p style={{ fontSize: 11, color: 'var(--c-text-sec)', margin: '2px 0 0' }}>{device.ipAddress} · {device.model || 'Unknown'}</p>
        </div>
      )}
    </div>
  );
}

export default function DeviceList() {
  const { apiFetch } = useAuth();
  const [isHovered, setIsHovered] = useState(false);
  const [tab, setTab] = useState('templates'); // 'templates' or 'discovery'
  
  // Discovery State
  const [subnet, setSubnet] = useState('10.0.1.0/24');
  const [community, setCommunity] = useState('public');
  const [scanning, setScanning] = useState(false);
  const [discoveredQueue, setDiscoveredQueue] = useState([]);

  useEffect(() => {
    if (tab === 'discovery') {
      fetchDiscoveryQueue();
    }
  }, [tab, apiFetch]);

  const fetchDiscoveryQueue = () => {
    apiFetch('/discovery/queue')
      .then(res => res.json())
      .then(setDiscoveredQueue)
      .catch(console.error);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await apiFetch('/discovery/scan', {
        method: 'POST',
        body: JSON.stringify({ subnet, community })
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredQueue(data.devices);
      }
    } catch (e) {
      console.error(e);
    }
    setScanning(false);
  };

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        width: isHovered ? 280 : 70, 
        background: 'var(--c-card)',
        borderRight: '1px solid var(--c-border)',
        display: 'flex', flexDirection: 'column',
        flexShrink: 0, 
        overflow: 'hidden',
        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 10,
        position: 'relative',
        boxShadow: isHovered ? '4px 0 15px rgba(0,0,0,0.1)' : 'none'
      }}
    >
      <div style={{ 
        padding: '18px 20px 10px', 
        borderBottom: '1px solid var(--c-border)',
        minWidth: 280,
        opacity: isHovered ? 1 : 0,
        transition: 'opacity 0.2s',
        visibility: isHovered ? 'visible' : 'hidden',
        height: isHovered ? 'auto' : 0,
        overflow: 'hidden'
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--c-text)' }}>Device Library</h3>
        
        {/* Sub-tabs */}
        <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
          <button 
            onClick={() => setTab('templates')}
            style={{
              padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4,
              border: 'none', cursor: 'pointer',
              background: tab === 'templates' ? 'var(--c-accent)' : 'transparent',
              color: tab === 'templates' ? '#fff' : 'var(--c-text-sec)'
            }}
          >
            Templates
          </button>
          <button 
            onClick={() => setTab('discovery')}
            style={{
              padding: '4px 8px', fontSize: 11, fontWeight: 700, borderRadius: 4,
              border: 'none', cursor: 'pointer',
              background: tab === 'discovery' ? 'var(--c-accent)' : 'transparent',
              color: tab === 'discovery' ? '#fff' : 'var(--c-text-sec)'
            }}
          >
            Auto-Discovery
          </button>
        </div>
      </div>

      {/* Collapsed indicator */}
      {!isHovered && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 24, gap: 20, pointerEvents: 'none'
        }}>
          {tab === 'templates' ? (
            <Monitor size={20} style={{ color: 'var(--c-accent)', opacity: 0.8 }} />
          ) : (
            <Compass size={20} style={{ color: 'var(--c-accent)', opacity: 0.8 }} />
          )}
          <div style={{
            writingMode: 'vertical-rl',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            fontSize: 10,
            fontWeight: 800,
            color: 'var(--c-text-sec)',
            opacity: 0.4
          }}>
            {tab === 'templates' ? 'Library' : 'Scan Queue'}
          </div>
        </div>
      )}

      {/* Expanded view */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 8px', minWidth: 280, opacity: isHovered ? 1 : 0.1, transition: 'opacity 0.3s' }}>
        {tab === 'templates' ? (
          DEVICE_CATEGORIES.map(cat => {
            const items = Object.entries(DEVICE_TYPES).filter(([, dt]) => dt.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} style={{ marginBottom: 16 }}>
                <p style={{
                  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '1px', color: 'var(--c-text-sec)',
                  padding: '0 12px', marginBottom: 8,
                  opacity: isHovered ? 1 : 0,
                  transition: 'opacity 0.2s'
                }}>{cat}</p>
                {items.map(([type, dt]) => (
                  <DraggableDevice key={type} type={type} dt={dt} isCollapsed={!isHovered} />
                ))}
              </div>
            );
          })
        ) : (
          <div style={{ padding: '0 8px' }}>
            <div style={{ 
              background: 'var(--c-surface2)', padding: 12, borderRadius: 8,
              border: '1px solid var(--c-border)', marginBottom: 16,
              display: 'flex', flexDirection: 'column', gap: 10
            }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>IP Subnet</label>
                <input 
                  className="form-input" style={{ fontSize: 12, padding: '6px 8px', marginTop: 4 }}
                  value={subnet} onChange={e => setSubnet(e.target.value)} placeholder="e.g. 10.0.1.0/24"
                />
              </div>
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>SNMP Community</label>
                <input 
                  className="form-input" style={{ fontSize: 12, padding: '6px 8px', marginTop: 4 }}
                  value={community} onChange={e => setCommunity(e.target.value)} placeholder="e.g. public"
                />
              </div>
              <button 
                className="btn-primary" 
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 11, padding: 8 }}
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? <RefreshCw size={12} className="animate-spin" /> : <Play size={12} />}
                {scanning ? 'Scanning...' : 'Scan Subnet'}
              </button>
            </div>

            <div>
              <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', color: 'var(--c-text-sec)', marginBottom: 12 }}>
                Discovered Devices ({discoveredQueue.length})
              </p>
              {discoveredQueue.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--c-text-sec)' }}>
                  <Search size={24} style={{ opacity: 0.2, marginBottom: 8, margin: '0 auto' }} />
                  <p style={{ fontSize: 11 }}>No discovered items in queue. Scan to find devices.</p>
                </div>
              ) : (
                discoveredQueue.map(device => (
                  <DraggableDiscoveredDevice key={device.id} device={device} isCollapsed={!isHovered} />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
