import { useState, useEffect, useCallback } from 'react';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import DeviceList from '../DevicePanel/DeviceList';
import RackView from './RackView';
import DeviceModal from './DeviceModal';
import DeviceItem from './DeviceItem';
import { DEVICE_TYPES } from '../../utils/deviceTypes';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { Server } from 'lucide-react';

export default function RackEditor({ selectedDcId, selectedRackId, deviceStatus, autoOpenDeviceId, onClearAutoOpen, onSaveFinished, onChangeRack }) {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [rack, setRack] = useState(null);
  const [allRacks, setAllRacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalDevice, setModalDevice] = useState(null);
  const [modalStartU, setModalStartU] = useState(null);
  const [activeDrag, setActiveDrag] = useState(null);
  const [overlay, setOverlay] = useState('none');
  const [connections, setConnections] = useState([]);
  const [showCables, setShowCables] = useState(true);

  const fetchConnections = useCallback(async () => {
    try {
      const res = await apiFetch('/connections');
      const data = await res.json();
      setConnections(data);
    } catch (e) {
      console.error(e);
    }
  }, [apiFetch]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections, rack]);

  useEffect(() => {
    if (autoOpenDeviceId && rack) {
      const dev = rack.devices?.find(d => d.id === autoOpenDeviceId);
      if (dev) {
        setModalDevice({ ...dev, defaultTab: 'ports' });
        onClearAutoOpen();
      }
    }
  }, [autoOpenDeviceId, rack, onClearAutoOpen]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const fetchRack = useCallback(async () => {
    if (!selectedDcId || !selectedRackId) return;
    setLoading(true);
    try {
      const res = await apiFetch(`/datacenters/${selectedDcId}/racks`);
      const racks = await res.json();
      setAllRacks(racks || []);
      const r = racks.find(r => r.id === selectedRackId);
      setRack(r || null);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [selectedDcId, selectedRackId, apiFetch]);

  useEffect(() => { fetchRack(); }, [fetchRack]);

  const handleDragStart = (event) => {
    const { active } = event;
    if (active.data.current?.type === 'new-device') {
      const deviceType = active.data.current.deviceType;
      const dt = DEVICE_TYPES[deviceType];
      setActiveDrag({ type: deviceType, dt });
    } else if (active.data.current?.type === 'discovered-device') {
      const devData = active.data.current.deviceData;
      const dt = DEVICE_TYPES[devData.type];
      setActiveDrag({ type: devData.type, dt, name: devData.name });
    }
  };

  const handleDragEnd = (event) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over || !active.data.current) return;
    const uNumber = over.data.current?.uNumber;
    if (!uNumber || over.data.current?.occupied) return;
    if (active.data.current.type === 'new-device') {
      const deviceType = active.data.current.deviceType;
      const dt = DEVICE_TYPES[deviceType];
      setModalStartU(uNumber);
      setModalDevice({
        type: deviceType, startU: uNumber - (dt.defaultHeight - 1),
        heightU: dt.defaultHeight, name: '', model: '', serialNumber: '',
        ipAddress: '', managementIp: '', monitoring: { protocol: 'none' },
      });
    } else if (active.data.current.type === 'discovered-device') {
      const devData = active.data.current.deviceData;
      const dt = DEVICE_TYPES[devData.type];
      setModalStartU(uNumber);
      setModalDevice({
        ...devData,
        startU: uNumber - (dt.defaultHeight - 1),
        heightU: dt.defaultHeight,
        isFromDiscovery: true
      });
    }
  };

  const handleDragCancel = () => setActiveDrag(null);

  const handleClickSlot = (uNumber) => {
    setModalStartU(uNumber);
    setModalDevice({
      type: 'server', startU: uNumber, heightU: 1,
      name: '', model: '', serialNumber: '',
      ipAddress: '', managementIp: '', monitoring: { protocol: 'none' },
    });
  };

  const handleClickDevice = (device) => setModalDevice(device);

  const handleSaveDevice = async (form) => {
    if (!selectedDcId || !selectedRackId) return;
    try {
      const isNew = !modalDevice?.id;
      const url = isNew
        ? `/datacenters/${selectedDcId}/racks/${selectedRackId}/devices`
        : `/datacenters/${selectedDcId}/racks/${selectedRackId}/devices/${modalDevice.id}`;
      const res = await apiFetch(url, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(form) });
      if (!res.ok) { 
        const err = await res.json(); 
        await showAlert(err.error || 'Failed to save', 'Error'); 
        return; 
      }
      if (form.isFromDiscovery) {
        try {
          await apiFetch(`/discovery/queue/${form.id}`, { method: 'DELETE' });
        } catch (e) {
          console.error('Failed to clean discovery queue', e);
        }
      }
      setModalDevice(null);
      fetchRack();
      fetchConnections();
      if (onSaveFinished) {
        onSaveFinished();
      }
    } catch (e) { 
      await showAlert('Error saving device', 'Error'); 
    }
  };

  const handleDeleteDevice = async (deviceId) => {
    const confirmed = await showConfirm('Are you sure you want to delete this device?', 'Delete Device');
    if (!confirmed) return;
    try {
      await apiFetch(`/datacenters/${selectedDcId}/racks/${selectedRackId}/devices/${deviceId}`, { method: 'DELETE' });
      setModalDevice(null); 
      fetchRack();
      fetchConnections();
      if (onSaveFinished) {
        onSaveFinished();
      }
    } catch (e) { 
      await showAlert('Error deleting device', 'Error'); 
    }
  };

  const handleExportPNG = async () => {
    const rackEl = document.querySelector('.rack-frame');
    if (!rackEl) return;
    try {
      const html2canvas = (await import('html2canvas')).default;
      const computedBg = window.getComputedStyle(rackEl).backgroundColor;
      const canvas = await html2canvas(rackEl, {
        backgroundColor: computedBg && !computedBg.includes('rgba(0, 0, 0, 0)') ? computedBg : '#0f172a',
        scale: 2,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = `${rack?.name || 'rack'}-layout.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
      await showAlert('Failed to export PNG', 'Error');
    }
  };

  const handleExportPDF = () => {
    if (!rack) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showAlert('Popup blocked. Please allow popups to export PDF.', 'Error');
      return;
    }
    
    const deviceRows = (rack.devices || [])
      .sort((a, b) => b.startU - a.startU)
      .map(d => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.startU}U</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.heightU}U</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;"><strong>${d.name}</strong></td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.type.toUpperCase()}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.model || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.ipAddress || '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.powerWatts ? d.powerWatts + 'W' : '-'}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${d.weightKg ? d.weightKg + 'kg' : '-'}</td>
        </tr>
      `).join('');

    const rackDeviceIds = new Set((rack.devices || []).map(d => d.id));
    const rackConnections = connections.filter(c => rackDeviceIds.has(c.fromDeviceId) && rackDeviceIds.has(c.toDeviceId));
    const connectionRows = rackConnections.map(c => `
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
          <title>${rack.name} - Configuration Report</title>
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; color: #333; margin: 40px; }
            h1 { font-size: 24px; color: #111; margin-bottom: 5px; }
            .subtitle { font-size: 14px; color: #666; margin-bottom: 30px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 2px solid #333; padding-bottom: 5px; margin-top: 30px; margin-bottom: 15px; text-transform: uppercase; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px; }
            th { text-align: left; background: #f5f5f5; padding: 10px; font-weight: bold; border-bottom: 2px solid #ddd; }
            .metric-box { display: flex; gap: 20px; margin-bottom: 25px; }
            .metric-card { flex: 1; background: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 6px; }
            .metric-card p { margin: 0; font-size: 12px; color: #666; }
            .metric-card h3 { margin: 5px 0 0; font-size: 18px; color: #111; }
            @media print {
              body { margin: 20px; }
              button { display: none; }
            }
          </style>
        </head>
        <body>
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
              <h1>${rack.name} - Configuration Report</h1>
              <div class="subtitle">Generated on ${new Date().toLocaleString()} · Datacenter Management System</div>
            </div>
            <button onclick="window.print()" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">Print / Save as PDF</button>
          </div>

          <div class="metric-box">
            <div class="metric-card">
              <p>Total Size</p>
              <h3>${rack.totalU}U</h3>
            </div>
            <div class="metric-card">
              <p>Total Installed Devices</p>
              <h3>${(rack.devices || []).length} Devices</h3>
            </div>
            <div class="metric-card">
              <p>Power Load</p>
              <h3>${(rack.devices || []).reduce((sum, d) => sum + (d.powerWatts || 0), 0)}W / ${rack.maxPowerWatts || 6000}W</h3>
            </div>
            <div class="metric-card">
              <p>Weight Load</p>
              <h3>${(rack.devices || []).reduce((sum, d) => sum + (d.weightKg || 0), 0)}kg / ${rack.maxWeightKg || 800}kg</h3>
            </div>
          </div>

          <div class="section-title">Device List</div>
          <table>
            <thead>
              <tr>
                <th>Start U</th>
                <th>Height</th>
                <th>Device Name</th>
                <th>Type</th>
                <th>Model</th>
                <th>IP Address</th>
                <th>Power</th>
                <th>Weight</th>
              </tr>
            </thead>
            <tbody>
              ${deviceRows}
            </tbody>
          </table>

          <div class="section-title">Patch Cable Connections</div>
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

  if (!selectedDcId || !selectedRackId) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <div style={{ textAlign: 'center', color: 'var(--c-text-sec)' }}>
          <Server size={48} style={{ opacity: 0.25, marginBottom: 16 }} />
          <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--c-text)' }}>Select a Rack</p>
          <p style={{ fontSize: 14, marginTop: 6 }}>Use the Data Centers page to create and select a rack</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragCancel={handleDragCancel}>
      <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
        <DeviceList />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 12, padding: '12px 24px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text-sec)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Overlays:</span>
            <button className={`filter-btn ${overlay === 'none' ? 'active' : ''}`} style={{ borderColor: overlay === 'none' ? 'var(--c-accent)' : 'var(--c-border)', color: overlay === 'none' ? 'var(--c-accent)' : 'var(--c-text-sec)', padding: '6px 12px' }} onClick={() => setOverlay('none')}>None</button>
            <button className={`filter-btn ${overlay === 'temp' ? 'active' : ''}`} style={{ borderColor: overlay === 'temp' ? 'var(--c-accent)' : 'var(--c-border)', color: overlay === 'temp' ? 'var(--c-accent)' : 'var(--c-text-sec)', padding: '6px 12px' }} onClick={() => setOverlay('temp')}>Temperature</button>
            <button className={`filter-btn ${overlay === 'power' ? 'active' : ''}`} style={{ borderColor: overlay === 'power' ? 'var(--c-accent)' : 'var(--c-border)', color: overlay === 'power' ? 'var(--c-accent)' : 'var(--c-text-sec)', padding: '6px 12px' }} onClick={() => setOverlay('power')}>Power Load</button>
            <button className={`filter-btn ${showCables ? 'active' : ''}`} style={{ borderColor: showCables ? 'var(--c-accent)' : 'var(--c-border)', color: showCables ? 'var(--c-accent)' : 'var(--c-text-sec)', padding: '6px 12px' }} onClick={() => setShowCables(!showCables)}>🔌 {showCables ? 'Hide Cables' : 'Show Cables'}</button>
            <button className="filter-btn" style={{ padding: '6px 12px', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: 12, marginLeft: 12 }} onClick={handleExportPNG}>🖼️ Export PNG</button>
            <button className="filter-btn" style={{ padding: '6px 12px', border: '1px solid var(--c-border)', color: 'var(--c-text)', fontSize: 12 }} onClick={handleExportPDF}>📄 Export PDF</button>
          </div>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--c-primary)' }}>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <div style={{ width: 32, height: 32, border: '3px solid #e5e7eb', borderTopColor: 'var(--c-accent)', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              </div>
            ) : rack ? (
              <RackView rack={rack} allRacks={allRacks} onChangeRack={onChangeRack} deviceStatus={deviceStatus} onClickDevice={handleClickDevice} onClickSlot={handleClickSlot} overlay={overlay} connections={connections} showCables={showCables} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--c-text-sec)' }}>Rack not found</div>
            )}
          </div>
        </div>
      </div>

      {/* Drag overlay — shows a ghost preview following the cursor */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
      }}>
        {activeDrag ? (
          <div style={{
            width: 520, height: activeDrag.dt.defaultHeight * 36,
            borderRadius: 5, overflow: 'hidden',
            boxShadow: '0 12px 40px rgba(0,0,0,0.35), 0 0 0 2px var(--c-accent)',
            transform: 'scale(1.02)',
            opacity: 0.92,
          }}>
            <DeviceItem
              device={{
                type: activeDrag.type,
                name: activeDrag.dt.label,
                heightU: activeDrag.dt.defaultHeight,
                status: 'online',
              }}
              isDragging
            />
          </div>
        ) : null}
      </DragOverlay>

      {modalDevice !== null && (
        <DeviceModal device={modalDevice} isNew={!modalDevice?.id}
          dcId={selectedDcId} rackId={selectedRackId}
          onSave={handleSaveDevice} onDelete={handleDeleteDevice}
          onClose={() => {
            setModalDevice(null);
            fetchConnections();
            if (onSaveFinished) {
              onSaveFinished();
            }
          }} />
      )}
    </DndContext>
  );
}
