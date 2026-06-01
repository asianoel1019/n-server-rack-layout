const express = require('express');
const { getDatacenters, getConnections } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/topology/:dcId
router.get('/:dcId', authMiddleware, async (req, res) => {
  try {
    const { dcId } = req.params;
    const dcs = await getDatacenters();
    const dc = dcs.find(d => d.id === dcId);
    
    if (!dc) {
      return res.status(404).json({ error: 'Datacenter not found' });
    }

    // Extract all devices and map rack context
    const devices = [];
    (dc.racks || []).forEach(rack => {
      (rack.devices || []).forEach(dev => {
        devices.push({
          ...dev,
          dcId: dc.id,
          dcName: dc.name,
          rackId: rack.id,
          rackName: rack.name,
          maxPowerWatts: rack.maxPowerWatts || 6000,
          maxWeightKg: rack.maxWeightKg || 800
        });
      });
    });

    const deviceIds = new Set(devices.map(d => d.id));
    const allConns = await getConnections();

    // Filter connections that connect devices within this datacenter
    const connections = allConns.filter(c => 
      deviceIds.has(c.fromDeviceId) || deviceIds.has(c.toDeviceId)
    );

    res.json({
      datacenterName: dc.name,
      devices,
      connections
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve topology' });
  }
});

module.exports = router;
