const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDatacenters, saveDatacenters } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');
const { logAudit } = require('../services/audit');

const router = express.Router();

// GET /api/datacenters
router.get('/', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  res.json(dcs);
});

// POST /api/datacenters
router.post('/', authMiddleware, async (req, res) => {
  const { name, location, phone, contact } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const dcs = await getDatacenters();
  const dc = {
    id: uuidv4(),
    name,
    location: location || '',
    phone: phone || '',
    contact: contact || '',
    accessList: [],
    racks: [],
    createdAt: new Date().toISOString(),
  };
  dcs.push(dc);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'CREATE_DC', `Created datacenter ${name}`);
  res.status(201).json(dc);
});

// PUT /api/datacenters/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const idx = dcs.findIndex((d) => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Datacenter not found' });
  const { name, location, phone, contact, accessList } = req.body;
  if (name) dcs[idx].name = name;
  if (location !== undefined) dcs[idx].location = location;
  if (phone !== undefined) dcs[idx].phone = phone;
  if (contact !== undefined) dcs[idx].contact = contact;
  if (accessList !== undefined) dcs[idx].accessList = accessList;
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'UPDATE_DC', `Updated datacenter ${dcs[idx].name}`);
  res.json(dcs[idx]);
});

// DELETE /api/datacenters/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  let dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.id);
  const dcName = dc ? dc.name : 'Unknown';
  dcs = dcs.filter((d) => d.id !== req.params.id);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'DELETE_DC', `Deleted datacenter ${dcName}`);
  res.json({ success: true });
});

// --- Rack routes nested under datacenter ---

// GET /api/datacenters/:dcId/racks
router.get('/:dcId/racks', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  res.json(dc.racks || []);
});

// POST /api/datacenters/:dcId/racks
router.post('/:dcId/racks', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const { name, totalU, floor, description, powerAmps, voltageVolts, maxPowerWatts, maxWeightKg } = req.body;
  const rack = {
    id: uuidv4(),
    name: name || 'New Rack',
    totalU: totalU || 42,
    floor: floor || '',
    description: description || '',
    powerAmps: powerAmps || '',
    voltageVolts: voltageVolts || '',
    maxPowerWatts: parseInt(maxPowerWatts) || 6000,
    maxWeightKg: parseInt(maxWeightKg) || 800,
    devices: [],
    createdAt: new Date().toISOString(),
  };
  if (!dc.racks) dc.racks = [];
  dc.racks.push(rack);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'CREATE_RACK', `Created rack ${rack.name} in datacenter ${dc.name}`);
  res.status(201).json(rack);
});

// PUT /api/datacenters/:dcId/racks/:rackId
router.put('/:dcId/racks/:rackId', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const rack = (dc.racks || []).find((r) => r.id === req.params.rackId);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  const { name, totalU, floor, description, powerAmps, voltageVolts, maxPowerWatts, maxWeightKg } = req.body;
  if (name) rack.name = name;
  if (totalU) rack.totalU = totalU;
  if (floor !== undefined) rack.floor = floor;
  if (description !== undefined) rack.description = description;
  if (powerAmps !== undefined) rack.powerAmps = powerAmps;
  if (voltageVolts !== undefined) rack.voltageVolts = voltageVolts;
  if (maxPowerWatts !== undefined) rack.maxPowerWatts = parseInt(maxPowerWatts);
  if (maxWeightKg !== undefined) rack.maxWeightKg = parseInt(maxWeightKg);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'UPDATE_RACK', `Updated rack ${rack.name} in datacenter ${dc.name}`);
  res.json(rack);
});

// DELETE /api/datacenters/:dcId/racks/:rackId
router.delete('/:dcId/racks/:rackId', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const rack = (dc.racks || []).find((r) => r.id === req.params.rackId);
  const rackName = rack ? rack.name : 'Unknown';
  dc.racks = (dc.racks || []).filter((r) => r.id !== req.params.rackId);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'DELETE_RACK', `Deleted rack ${rackName} from datacenter ${dc.name}`);
  res.json({ success: true });
});

// --- Device routes nested under rack ---

// POST /api/datacenters/:dcId/racks/:rackId/devices
router.post('/:dcId/racks/:rackId/devices', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const rack = (dc.racks || []).find((r) => r.id === req.params.rackId);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });

  const { name, type, model, serialNumber, startU, heightU, ipAddress, managementIp, monitoring, nodeCount, nodes, powerWatts, weightKg } = req.body;

  // Validate U position
  const sU = parseInt(startU) || 1;
  const hU = parseInt(heightU) || 1;
  if (sU < 1 || sU + hU - 1 > rack.totalU) {
    return res.status(400).json({ error: 'Invalid U position' });
  }

  // Check for overlaps
  const occupied = (rack.devices || []).some((d) => {
    const dEnd = d.startU + d.heightU - 1;
    const newEnd = sU + hU - 1;
    return sU <= dEnd && newEnd >= d.startU;
  });
  if (occupied) {
    return res.status(400).json({ error: 'U position already occupied' });
  }

  const device = {
    id: uuidv4(),
    name: name || 'New Device',
    type: type || 'server',
    model: model || '',
    serialNumber: serialNumber || '',
    startU: sU,
    heightU: hU,
    ipAddress: ipAddress || '',
    managementIp: managementIp || '',
    monitoring: monitoring || { protocol: 'none' },
    nodeCount: nodeCount || 1,
    nodes: nodes || [],
    powerWatts: parseInt(powerWatts) || 0,
    weightKg: parseInt(weightKg) || 0,
    status: 'unknown',
    lastSeen: null,
    createdAt: new Date().toISOString(),
  };

  if (!rack.devices) rack.devices = [];
  rack.devices.push(device);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'CREATE_DEVICE', `Created device ${device.name} in rack ${rack.name}`);
  res.status(201).json(device);
});

// PUT /api/datacenters/:dcId/racks/:rackId/devices/:deviceId
router.put('/:dcId/racks/:rackId/devices/:deviceId', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const rack = (dc.racks || []).find((r) => r.id === req.params.rackId);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  const device = (rack.devices || []).find((d) => d.id === req.params.deviceId);
  if (!device) return res.status(404).json({ error: 'Device not found' });

  const fields = ['name', 'type', 'model', 'serialNumber', 'startU', 'heightU', 'ipAddress', 'managementIp', 'monitoring', 'nodeCount', 'nodes', 'powerWatts', 'weightKg'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      device[f] = ['startU', 'heightU', 'powerWatts', 'weightKg'].includes(f) ? parseInt(req.body[f]) : req.body[f];
    }
  });

  // Re-validate position after update
  if (req.body.startU || req.body.heightU) {
    if (device.startU < 1 || device.startU + device.heightU - 1 > rack.totalU) {
      return res.status(400).json({ error: 'Invalid U position' });
    }
    const overlap = (rack.devices || []).some((d) => {
      if (d.id === device.id) return false;
      const dEnd = d.startU + d.heightU - 1;
      const newEnd = device.startU + device.heightU - 1;
      return device.startU <= dEnd && newEnd >= d.startU;
    });
    if (overlap) {
      return res.status(400).json({ error: 'U position already occupied' });
    }
  }

  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'UPDATE_DEVICE', `Updated device ${device.name} in rack ${rack.name}`);
  res.json(device);
});

// DELETE /api/datacenters/:dcId/racks/:rackId/devices/:deviceId
router.delete('/:dcId/racks/:rackId/devices/:deviceId', authMiddleware, async (req, res) => {
  const dcs = await getDatacenters();
  const dc = dcs.find((d) => d.id === req.params.dcId);
  if (!dc) return res.status(404).json({ error: 'Datacenter not found' });
  const rack = (dc.racks || []).find((r) => r.id === req.params.rackId);
  if (!rack) return res.status(404).json({ error: 'Rack not found' });
  const device = (rack.devices || []).find((d) => d.id === req.params.deviceId);
  const deviceName = device ? device.name : 'Unknown';
  rack.devices = (rack.devices || []).filter((d) => d.id !== req.params.deviceId);
  await saveDatacenters(dcs);
  await logAudit(req.user.username, 'DELETE_DEVICE', `Deleted device ${deviceName} from rack ${rack.name}`);
  res.json({ success: true });
});

module.exports = router;
