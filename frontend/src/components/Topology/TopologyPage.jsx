import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Network, Server, Shield, ToggleLeft, ArrowRight, Activity, Clock, Layers, Cpu, HelpCircle, HardDrive } from 'lucide-react';
import { DEVICE_TYPES } from '../../utils/deviceTypes';

export default function TopologyPage({ onSelectRack }) {
  const { apiFetch } = useAuth();
  const [datacenters, setDatacenters] = useState([]);
  const [selectedDcId, setSelectedDcId] = useState('');
  const [topologyData, setTopologyData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [hoveredCable, setHoveredCable] = useState(null);

  useEffect(() => {
    apiFetch('/datacenters')
      .then(res => res.json())
      .then(data => {
        setDatacenters(data);
        if (data.length > 0) {
          setSelectedDcId(data[0].id);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedDcId) return;
    setLoading(true);
    apiFetch(`/topology/${selectedDcId}`)
      .then(res => res.json())
      .then(data => {
        setTopologyData(data);
        setSelectedDevice(null);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedDcId]);

  if (loading || !topologyData) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  const { devices = [], connections = [] } = topologyData;

  const filteredDevices = devices.filter(d => {
    const dt = DEVICE_TYPES[d.type];
    return dt && dt.category !== 'Others';
  });

  // Classify devices into layers
  const firewalls = filteredDevices.filter(d => d.type === 'firewall' || d.type === 'router');
  const coreSwitches = filteredDevices.filter(d => d.type === 'switch' && (d.name.toLowerCase().includes('core') || d.model.toLowerCase().includes('core')));
  const accessSwitches = filteredDevices.filter(d => d.type === 'switch' && !coreSwitches.some(cs => cs.id === d.id));
  const endpoints = filteredDevices.filter(d => d.type !== 'switch' && d.type !== 'firewall' && d.type !== 'router');

  const tiers = [
    { label: 'Security & Gateway Gateways', items: firewalls, color: '#ef4444' },
    { label: 'Core Backbone Switches', items: coreSwitches, color: '#a855f7' },
    { label: 'Distribution & Access Switches', items: accessSwitches, color: '#3b82f6' },
    { label: 'Compute & Storage Endpoints', items: endpoints, color: '#10b981' }
  ];

  // Calculate dynamic grid dimensions & heights
  const canvasWidth = 840;
  const coords = {};
  const tierHeights = [];
  const tierYOffsets = [];
  let currentY = 0;

  tiers.forEach((tier) => {
    const rows = Math.ceil(tier.items.length / 4);
    const h = Math.max(1, rows) * 90 + 30;
    tierHeights.push(h);
    tierYOffsets.push(currentY);
    currentY += h;
  });

  tiers.forEach((tier, tierIdx) => {
    const items = tier.items;
    const itemsPerRow = 4;
    items.forEach((item, itemIdx) => {
      const rowIdx = Math.floor(itemIdx / itemsPerRow);
      const colIdx = itemIdx % itemsPerRow;
      const rowItemCount = Math.min(itemsPerRow, items.length - rowIdx * itemsPerRow);
      
      const localY = rowIdx * 90 + 50;
      
      coords[item.id] = {
        x: ((colIdx + 0.5) * canvasWidth) / rowItemCount,
        y: tierYOffsets[tierIdx] + localY,
        localY: localY
      };
    });
  });

  const handleExportPNG = async () => {
    const canvasEl = document.querySelector('.topology-canvas');
    if (!canvasEl) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const computedBg = window.getComputedStyle(canvasEl).backgroundColor;
      const canvas = await html2canvas(canvasEl, {
        backgroundColor: computedBg && !computedBg.includes('rgba(0, 0, 0, 0)') ? computedBg : '#1a1a2e',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `${activeDc?.name || 'datacenter'}-topology.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Failed to export PNG', e);
    }
  };

  const handleExportPDF = () => {
    if (!activeDc) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const fwList = firewalls.map(d => `<li><strong>${d.name}</strong> (${d.model || 'Unknown Model'}) - Rack: ${d.rackName}, U: ${d.startU}</li>`).join('') || '<li>No gateway devices</li>';
    const coreList = coreSwitches.map(d => `<li><strong>${d.name}</strong> (${d.model || 'Unknown Model'}) - Rack: ${d.rackName}, U: ${d.startU}</li>`).join('') || '<li>No core switches</li>';
    const accList = accessSwitches.map(d => `<li><strong>${d.name}</strong> (${d.model || 'Unknown Model'}) - Rack: ${d.rackName}, U: ${d.startU}</li>`).join('') || '<li>No access switches</li>';
    const endList = endpoints.map(d => `<li><strong>${d.name}</strong> (${d.model || 'Unknown Model'}) - Rack: ${d.rackName}, U: ${d.startU}</li>`).join('') || '<li>No endpoints</li>';

    const connectionRows = connections.map(c => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${c.fromDeviceName} [${c.fromPort}]</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">&harr;</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${c.toDeviceName} [${c.toPort}]</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;"><span style="color: ${c.cableColor}; font-weight: bold;">${c.cableType}</span></td>
      </tr>
    `).join('') || '<tr><td colspan="4" style="padding: 10px; text-align: center; color: #777;">No patch connections configured</td></tr>';

    printWindow.document.write(`
      <html>
        <head>
          <title>${activeDc.name} - Network Topology Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
            h1 { font-size: 24px; color: #111; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { text-align: left; background: #f5f5f5; padding: 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
            ul { font-size: 13px; line-height: 1.6; margin-bottom: 20px; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>${activeDc.name} - Network Topology Report</h1>
              <div class="subtitle">Generated on ${new Date().toLocaleString()} · Datacenter Management System</div>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">Print / Save as PDF</button>
          </div>

          <div class="section-title">Device Hierarchy</div>
          
          <h3 style="font-size: 14px; margin-bottom: 8px; color: #ef4444;">Security & Gateway Gateways</h3>
          <ul>${fwList}</ul>

          <h3 style="font-size: 14px; margin-bottom: 8px; color: #a855f7;">Core Backbone Switches</h3>
          <ul>${coreList}</ul>

          <h3 style="font-size: 14px; margin-bottom: 8px; color: #3b82f6;">Distribution & Access Switches</h3>
          <ul>${accList}</ul>

          <h3 style="font-size: 14px; margin-bottom: 8px; color: #10b981;">Compute & Storage Endpoints</h3>
          <ul>${endList}</ul>

          <div class="section-title">Network Connections</div>
          <table>
            <thead>
              <tr>
                <th>Source Port</th>
                <th></th>
                <th>Destination Port</th>
                <th>Cable Details</th>
              </tr>
            </thead>
            <tbody>
              ${connectionRows}
            </tbody>
          </table>
          
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Find rack info of selected device to display mini-rack
  const activeDc = datacenters.find(d => d.id === selectedDcId);
  const selectedRack = activeDc?.racks?.find(r => r.id === selectedDevice?.rackId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', background: 'var(--c-primary)', overflow: 'hidden' }}>
      {/* Left side Graph Canvas */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Network size={20} style={{ color: 'var(--c-accent)' }} />
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Data Center Topology</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="filter-btn" style={{ padding: '6px 12px', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: 12 }} onClick={handleExportPNG}>🖼️ Export PNG</button>
            <button className="filter-btn" style={{ padding: '6px 12px', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: 12 }} onClick={handleExportPDF}>📄 Export PDF</button>
            <select 
              className="form-input" 
              style={{ width: 200, padding: '6px 12px', fontSize: 13 }}
              value={selectedDcId}
              onChange={e => setSelectedDcId(e.target.value)}
            >
              {datacenters.map(dc => (
                <option key={dc.id} value={dc.id}>{dc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {devices.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--c-border)', borderRadius: 12, background: 'var(--c-card)' }}>
            <div style={{ textAlign: 'center', color: 'var(--c-text-sec)' }}>
              <Network size={48} style={{ opacity: 0.2, marginBottom: 12, margin: '0 auto' }} />
              <p>No devices configured in this Datacenter.</p>
              <p style={{ fontSize: 12, marginTop: 4 }}>Add devices to Racks first to view topology.</p>
            </div>
          </div>
        ) : (
          <div className="topology-canvas" style={{ position: 'relative', width: canvasWidth, minHeight: currentY + 40, background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '20px 0', margin: '0 auto', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
            
            {/* SVG overlay for cables */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
              {connections.map(conn => {
                const pt1 = coords[conn.fromDeviceId];
                const pt2 = coords[conn.toDeviceId];
                if (!pt1 || !pt2) return null;

                const midY = (pt1.y + pt2.y) / 2;
                const pathD = `M ${pt1.x} ${pt1.y} C ${pt1.x} ${midY}, ${pt2.x} ${midY}, ${pt2.x} ${pt2.y}`;

                const isHovered = hoveredCable === conn.id;

                return (
                  <g key={conn.id}>
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(0,0,0,0.5)"
                      strokeWidth={isHovered ? 7 : 4}
                      style={{ transition: 'stroke-width 0.15s' }}
                    />
                    <path
                      d={pathD}
                      fill="none"
                      stroke={conn.cableColor || 'var(--c-accent)'}
                      strokeWidth={isHovered ? 4 : 2}
                      strokeDasharray={conn.cableType === 'OM4' ? '4,4' : 'none'}
                      style={{ cursor: 'pointer', pointerEvents: 'auto', transition: 'stroke-width 0.15s' }}
                      onMouseEnter={() => setHoveredCable(conn.id)}
                      onMouseLeave={() => setHoveredCable(null)}
                    />
                  </g>
                );
              })}
            </svg>

            {/* Hierarchical Tiers */}
            {tiers.map((tier, tierIdx) => {
              return (
                <div key={tier.label} style={{ position: 'relative', height: tierHeights[tierIdx], zIndex: 2 }}>
                  <div style={{ position: 'absolute', left: 24, top: 4, fontSize: 10, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', color: 'var(--c-text-sec)' }}>
                    {tier.label}
                  </div>
                  {tier.items.map(item => {
                    const coord = coords[item.id];
                    if (!coord) return null;
                    
                    const isSelected = selectedDevice?.id === item.id;
                    const statusDot = item.status === 'online' ? '#22c55e' : item.status === 'warning' ? '#f59e0b' : '#ef4444';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedDevice(item)}
                        style={{
                          position: 'absolute',
                          left: coord.x - 70,
                          top: coord.localY - 30,
                          width: 140,
                          padding: '10px 12px',
                          borderRadius: 10,
                          background: isSelected ? 'var(--c-surface2)' : 'var(--c-surface)',
                          border: `2px solid ${isSelected ? 'var(--c-accent)' : 'var(--c-border)'}`,
                          cursor: 'pointer',
                          boxShadow: isSelected ? '0 0 15px rgba(56, 189, 248, 0.25)' : '0 4px 10px rgba(0,0,0,0.1)',
                          transition: 'all 0.2s',
                          textAlign: 'center'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 4 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: statusDot }} />
                          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 100 }}>
                            {item.name}
                          </span>
                        </div>
                        <span style={{ fontSize: 9, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                          {item.type}
                        </span>
                        <div style={{ fontSize: 9, color: 'var(--c-text-sec)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.rackName} · {item.startU}U
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right side Detail & Mini-Rack panel */}
      <div style={{
        width: 380,
        background: 'var(--c-card)',
        borderLeft: '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        overflowY: 'auto',
        padding: 24,
        boxShadow: '-4px 0 15px rgba(0,0,0,0.05)'
      }}>
        {selectedDevice ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Header info */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 24 }}>
                  {selectedDevice.type === 'firewall' ? '🛡️' : selectedDevice.type === 'switch' ? '🔌' : '🖥️'}
                </span>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--c-text)', margin: 0 }}>{selectedDevice.name}</h3>
                  <span style={{ fontSize: 11, color: 'var(--c-text-sec)', textTransform: 'uppercase', fontWeight: 600 }}>
                    {selectedDevice.model || 'Unknown Model'}
                  </span>
                </div>
              </div>
            </div>

            {/* Properties */}
            <div style={{ background: 'var(--c-surface)', padding: 12, borderRadius: 10, border: '1px solid var(--c-border)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 12 }}>
              <div>
                <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>Rack Frame</span>
                <strong>{selectedDevice.rackName}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>U Position</span>
                <strong>U {selectedDevice.startU} ({selectedDevice.heightU}U)</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--c-text-sec)', display: 'block', fontSize: 10, textTransform: 'uppercase' }}>IP Address</span>
                <strong>{selectedDevice.ipAddress || 'Not Assigned'}</strong>
              </div>
            </div>

            <button 
              className="action-btn"
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
                background: 'var(--c-accent)',
                color: 'var(--c-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
              onClick={() => onSelectRack(selectedDevice.dcId, selectedDevice.rackId, selectedDevice.id, 'topology')}
            >
              🔌 Configure Ports & Cables
            </button>

            {/* Visual Mini-Rack highlight */}
            {selectedRack && (
              <div>
                <h4 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Layers size={14} style={{ color: 'var(--c-accent)' }} /> Physical Rack Position
                </h4>
                
                <div style={{ 
                  background: 'var(--c-surface)', 
                  border: '1px solid var(--c-border)', 
                  borderRadius: 10, 
                  padding: 16, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center' 
                }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--c-text-sec)', marginBottom: 8 }}>{selectedRack.name}</div>
                  
                  {/* Visual rack slots wrapper */}
                  <div style={{ 
                    border: '2px solid #555', 
                    borderRadius: 4, 
                    width: 140, 
                    background: '#1a1a2e', 
                    display: 'flex', 
                    flexDirection: 'column',
                    padding: 2
                  }}>
                    {Array.from({ length: selectedRack.totalU || 42 }).map((_, idx) => {
                      const uNum = (selectedRack.totalU || 42) - idx;
                      const isOccupiedByTarget = uNum >= selectedDevice.startU && uNum < selectedDevice.startU + selectedDevice.heightU;
                      const isOccupiedByOther = !isOccupiedByTarget && selectedRack.devices?.some(d => uNum >= d.startU && uNum < d.startU + d.heightU);

                      return (
                        <div 
                          key={uNum} 
                          style={{
                            height: 6,
                            margin: '1px 0',
                            borderRadius: 1,
                            background: isOccupiedByTarget ? 'var(--c-accent)' : isOccupiedByOther ? '#334155' : 'transparent',
                            borderBottom: '1px solid rgba(255,255,255,0.03)',
                            boxShadow: isOccupiedByTarget ? '0 0 8px var(--c-accent)' : 'none',
                            animation: isOccupiedByTarget ? 'pulse 1.5s infinite alternate' : 'none'
                          }} 
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-sec)', textAlign: 'center' }}>
            <div>
              <HelpCircle size={32} style={{ opacity: 0.2, marginBottom: 8, margin: '0 auto' }} />
              <p style={{ fontSize: 13 }}>Click a node on the topology to view details and visual rack placement.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
