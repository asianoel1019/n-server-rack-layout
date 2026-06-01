import { DEVICE_TYPES } from '../../utils/deviceTypes';

export default function DeviceItem({ device, status, onClick, isDragging }) {
  const dt = DEVICE_TYPES[device.type] || DEVICE_TYPES.server;
  const statusKey = status?.status || device.status || 'unknown';
  const height = (device.heightU || 1) * 36;

  return (
    <div
      className="device-card"
      style={{
        display: 'flex', alignItems: 'center',
        width: '100%', padding: '0 12px', height: `${height}px`,
        background: dt.gradient, border: `1px solid ${dt.color}44`,
        opacity: isDragging ? 0.6 : 1,
        userSelect: 'none',
      }}
      onClick={onClick}
    >
      {/* Left accent bar */}
      <div style={{ width: 3, borderRadius: 2, height: '60%', background: dt.color, marginRight: 10, flexShrink: 0 }} />

      {/* Device info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: 16, flexShrink: 0 }}>{dt.icon}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {device.name || 'Unnamed'}
          </p>
          {device.heightU > 1 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {dt.label} · {device.model || 'N/A'}
            </p>
          )}
        </div>
      </div>

      {/* Port indicators for network devices */}
      {['switch', 'patchpanel', 'router'].includes(device.type) && (
        <div style={{ display: 'flex', gap: 1, marginRight: 8, flexShrink: 0 }}>
          {Array.from({ length: Math.min(8, device.type === 'switch' ? 8 : 4) }).map((_, i) => (
            <div key={i} style={{ width: 4, height: 6, borderRadius: 1, background: status?.ports?.[i]?.status === 'up' ? '#22c55e' : '#6b7280' }} />
          ))}
        </div>
      )}

      {/* Power indicators for PDU */}
      {device.type === 'pdu' && (
        <div style={{ display: 'flex', gap: 3, marginRight: 8, flexShrink: 0 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < 3 ? '#f59e0b' : '#6b7280' }} />
          ))}
        </div>
      )}

      {/* Status LED */}
      <span className={`status-led ${statusKey}`} />
    </div>
  );
}
