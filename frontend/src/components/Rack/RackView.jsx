import { useDroppable } from '@dnd-kit/core';
import DeviceItem from './DeviceItem';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function RackView({ rack, allRacks = [], onChangeRack, deviceStatus, onClickDevice, onClickSlot, overlay = 'none', connections = [], showCables = true }) {
  const totalU = rack?.totalU || 42;
  const devices = rack?.devices || [];

  // Find previous and next rack in the datacenter list
  const currentIdx = allRacks.findIndex(r => r.id === rack?.id);
  const prevRack = currentIdx > 0 ? allRacks[currentIdx - 1] : null;
  const nextRack = currentIdx >= 0 && currentIdx < allRacks.length - 1 ? allRacks[currentIdx + 1] : null;

  // Compute power and weight totals
  const totalWeight = devices.reduce((sum, d) => sum + (d.weightKg || 0), 0);
  const totalPower = devices.reduce((sum, d) => sum + (d.powerWatts || 0), 0);
  const maxPower = rack?.maxPowerWatts || 6000;
  const maxWeight = rack?.maxWeightKg || 800;
  
  const powerPct = Math.min(100, Math.round((totalPower / maxPower) * 100));
  const weightPct = Math.min(100, Math.round((totalWeight / maxWeight) * 100));

  // Build a map of which U slots are occupied
  const slotMap = {};
  devices.forEach(d => {
    for (let u = d.startU; u < d.startU + d.heightU; u++) {
      slotMap[u] = d;
    }
  });

  // Render slots from top (highest U) to bottom (U1)
  const slots = [];
  let u = totalU;
  while (u >= 1) {
    const device = slotMap[u];
    if (device && device.startU + device.heightU - 1 === u) {
      slots.push(
        <DeviceSlot key={`dev-${device.id}`} uNumber={u} device={device} deviceStatus={deviceStatus?.[device.id]}
          onClickDevice={onClickDevice} overlay={overlay} />
      );
      u -= device.heightU;
    } else if (device) {
      u--;
    } else {
      slots.push(
        <EmptySlot key={`empty-${u}`} uNumber={u} onClickSlot={onClickSlot} />
      );
      u--;
    }
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 24px' }}>
      <div className="rack-frame" style={{ width: 620, padding: '12px 16px' }}>
        {/* Rack header */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '12px 0 10px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 12 }}>
          {prevRack && (
            <button 
              onClick={() => onChangeRack(prevRack.id)}
              style={{
                position: 'absolute',
                left: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--c-accent)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.background = 'none';
              }}
              title={`Previous: ${prevRack.name}`}
            >
              <ChevronLeft size={20} />
            </button>
          )}

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 15, fontWeight: 700, color: 'rgba(255,255,255,0.85)', margin: 0 }}>{rack?.name || 'Rack'}</p>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2, margin: 0 }}>{totalU}U</p>
          </div>

          {nextRack && (
            <button 
              onClick={() => onChangeRack(nextRack.id)}
              style={{
                position: 'absolute',
                right: 4,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.6)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--c-accent)';
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                e.currentTarget.style.background = 'none';
              }}
              title={`Next: ${nextRack.name}`}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>

        {/* Capacity Gauges */}
        <div style={{ display: 'flex', gap: 16, padding: '12px 16px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>🔌 Power Draw</span>
              <span>{totalPower}W / {maxPower}W ({powerPct}%)</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${powerPct}%`, background: powerPct > 90 ? '#ef4444' : powerPct > 75 ? '#f59e0b' : '#22c55e', transition: 'width 0.3s' }} />
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>
              <span>⚖ Weight Load</span>
              <span>{totalWeight}kg / {maxWeight}kg ({weightPct}%)</span>
            </div>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${weightPct}%`, background: weightPct > 90 ? '#ef4444' : weightPct > 75 ? '#f59e0b' : '#22c55e', transition: 'width 0.3s' }} />
            </div>
          </div>
        </div>

        {/* Slots */}
        <div style={{ position: 'relative' }}>
          {showCables && connections && (
            <svg style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20, width: '100%', height: '100%' }}>
              {(() => {
                const rackDeviceIds = new Set(devices.map(d => d.id));
                const rackConnections = connections.filter(c => rackDeviceIds.has(c.fromDeviceId) && rackDeviceIds.has(c.toDeviceId));
                
                return rackConnections.map(conn => {
                  const dev1 = devices.find(d => d.id === conn.fromDeviceId);
                  const dev2 = devices.find(d => d.id === conn.toDeviceId);
                  if (!dev1 || !dev2) return null;
                  
                  const dev1Top = (totalU - (dev1.startU + dev1.heightU - 1)) * 36;
                  const dev1CenterY = dev1Top + (dev1.heightU * 36) / 2;
                  
                  const dev2Top = (totalU - (dev2.startU + dev2.heightU - 1)) * 36;
                  const dev2CenterY = dev2Top + (dev2.heightU * 36) / 2;
                  
                  const startX = 520;
                  const endX = 520;
                  const curveOffset = Math.min(60, Math.max(20, Math.abs(dev1CenterY - dev2CenterY) / 2.5));
                  const pathD = `M ${startX} ${dev1CenterY} C ${startX + curveOffset} ${dev1CenterY}, ${endX + curveOffset} ${dev2CenterY}, ${endX} ${dev2CenterY}`;
                  
                  return (
                    <g key={conn.id}>
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke="rgba(0,0,0,0.4)" 
                        strokeWidth={5} 
                      />
                      <path 
                        d={pathD} 
                        fill="none" 
                        stroke={conn.cableColor || '#3b82f6'} 
                        strokeWidth={2.5} 
                        strokeDasharray={conn.cableType === 'OM4' ? '4,4' : 'none'}
                      />
                      <circle cx={startX} cy={dev1CenterY} r={3.5} fill={conn.cableColor || '#3b82f6'} stroke="#fff" strokeWidth={1} />
                      <circle cx={endX} cy={dev2CenterY} r={3.5} fill={conn.cableColor || '#3b82f6'} stroke="#fff" strokeWidth={1} />
                    </g>
                  );
                });
              })()}
            </svg>
          )}
          <div>{slots.map(s => s)}</div>
        </div>

        {/* Rack footer */}
        <div style={{ textAlign: 'center', padding: '10px 0 8px', borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>⚡ DCIM VISUAL RACK LAYOUT</p>
        </div>
      </div>
    </div>
  );
}

function EmptySlot({ uNumber, onClickSlot }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${uNumber}`,
    data: { uNumber },
  });

  return (
    <div ref={setNodeRef}
      className={`rack-slot ${isOver ? 'drag-over' : ''}`}
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', height: 36 }}
      onClick={() => onClickSlot(uNumber)}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', width: 36, textAlign: 'right', marginRight: 12, userSelect: 'none' }}>{uNumber}</span>
      <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', marginRight: 4 }} />
      <div style={{ flex: 1 }} />
      <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)', marginLeft: 4 }} />
    </div>
  );
}

function DeviceSlot({ uNumber, device, deviceStatus, onClickDevice, overlay }) {
  const { isOver, setNodeRef } = useDroppable({
    id: `slot-${uNumber}`,
    data: { uNumber, occupied: true },
  });

  let overlayColor = null;
  let overlayText = '';
  
  if (overlay === 'temp' && deviceStatus?.temperatureC !== undefined) {
    const t = deviceStatus.temperatureC;
    overlayText = `${t}°C`;
    if (t < 40) overlayColor = 'rgba(59, 130, 246, 0.45)'; // blue
    else if (t < 50) overlayColor = 'rgba(34, 197, 94, 0.45)'; // green
    else if (t < 60) overlayColor = 'rgba(245, 158, 11, 0.55)'; // orange
    else overlayColor = 'rgba(239, 68, 68, 0.6)'; // red
  } else if (overlay === 'power' && device.powerWatts) {
    const p = device.powerWatts;
    overlayText = `${p}W`;
    if (p < 250) overlayColor = 'rgba(34, 197, 94, 0.45)'; // green
    else if (p < 500) overlayColor = 'rgba(245, 158, 11, 0.5)'; // orange
    else overlayColor = 'rgba(239, 68, 68, 0.6)'; // red
  }

  return (
    <div ref={setNodeRef} style={{ display: 'flex', alignItems: 'stretch', height: `${device.heightU * 36}px` }}>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', width: 36, textAlign: 'right', marginRight: 12, alignSelf: 'flex-start', paddingTop: 8, userSelect: 'none' }}>{uNumber}</span>
      <div style={{ width: 5, alignSelf: 'center' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
      <div style={{ flex: 1, margin: '0 6px', position: 'relative' }}>
        <DeviceItem device={device} status={deviceStatus} onClick={() => onClickDevice(device)} />
        {overlayColor && (
          <div style={{
            position: 'absolute', inset: 0, background: overlayColor,
            pointerEvents: 'none', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 700,
            textShadow: '0 1px 3px rgba(0,0,0,0.8)', zIndex: 10,
            borderRadius: 5
          }}>
            {overlayText}
          </div>
        )}
      </div>
      <div style={{ width: 5, alignSelf: 'center' }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
      </div>
    </div>
  );
}
