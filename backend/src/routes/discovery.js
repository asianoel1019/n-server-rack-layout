const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const { readJSON, writeJSON } = require('../services/storage');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Helper to load/save the discovery queue
async function getQueue() {
  return (await readJSON('discovery_queue.json')) || [];
}
async function saveQueue(queue) {
  return writeJSON('discovery_queue.json', queue);
}

// GET /api/discovery/queue
router.get('/queue', authMiddleware, async (req, res) => {
  try {
    const queue = await getQueue();
    res.json(queue);
  } catch (e) {
    res.status(500).json({ error: 'Failed to read discovery queue' });
  }
});

// POST /api/discovery/scan
router.post('/scan', authMiddleware, async (req, res) => {
  try {
    const { subnet, community } = req.body;
    if (!subnet) {
      return res.status(400).json({ error: 'Subnet CIDR is required' });
    }

    // Trigger an audit log for the scan attempt
    await logAudit(req.user.username, 'TRIGGER_SCAN', `Triggered network scan on ${subnet}`);

    // Mock discovering 3 devices after a short simulation
    const discovered = [
      {
        id: uuidv4(),
        name: `DS-Switch-${Math.floor(Math.random() * 900 + 100)}`,
        type: 'switch',
        model: 'EdgeSwitch 24-Lite',
        serialNumber: 'SN-' + uuidv4().slice(0, 8).toUpperCase(),
        ipAddress: subnet.replace(/\.0\/\d+/, '.10'),
        managementIp: '',
        snmpCommunity: community || 'public',
        monitoring: { protocol: 'snmp' },
        status: 'online',
        powerWatts: 150,
        weightKg: 8
      },
      {
        id: uuidv4(),
        name: `DS-Server-${Math.floor(Math.random() * 900 + 100)}`,
        type: 'server',
        model: 'Dell PowerEdge R640',
        serialNumber: 'SN-' + uuidv4().slice(0, 8).toUpperCase(),
        ipAddress: subnet.replace(/\.0\/\d+/, '.101'),
        managementIp: subnet.replace(/\.0\/\d+/, '.201'),
        snmpCommunity: community || 'public',
        monitoring: { protocol: 'snmp' },
        status: 'online',
        powerWatts: 450,
        weightKg: 18
      },
      {
        id: uuidv4(),
        name: `DS-Gateway-${Math.floor(Math.random() * 900 + 100)}`,
        type: 'router',
        model: 'MikroTik CCR2004',
        serialNumber: 'SN-' + uuidv4().slice(0, 8).toUpperCase(),
        ipAddress: subnet.replace(/\.0\/\d+/, '.1'),
        managementIp: '',
        snmpCommunity: community || 'public',
        monitoring: { protocol: 'none' },
        status: 'online',
        powerWatts: 75,
        weightKg: 5
      }
    ];

    const currentQueue = await getQueue();
    const updatedQueue = [...currentQueue, ...discovered];
    await saveQueue(updatedQueue);

    res.json({
      message: 'Scan completed successfully',
      subnet,
      devicesFoundCount: discovered.length,
      devices: discovered
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to process network scan' });
  }
});

// DELETE /api/discovery/queue/:id
router.delete('/queue/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const currentQueue = await getQueue();
    const filtered = currentQueue.filter(item => item.id !== id);
    await saveQueue(filtered);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Failed to remove device from queue' });
  }
});

module.exports = router;
