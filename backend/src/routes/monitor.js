const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { getDeviceStatus } = require('../services/storage');

const router = express.Router();

// GET /api/monitor/:deviceId
router.get('/:deviceId', authMiddleware, async (req, res) => {
  const status = await getDeviceStatus();
  const deviceStatus = status[req.params.deviceId];
  if (!deviceStatus) {
    return res.json({
      status: 'unknown',
      cpu: null,
      memory: null,
      ports: [],
      lastPoll: null,
    });
  }
  res.json(deviceStatus);
});

// POST /api/monitor/:deviceId/poll — trigger immediate poll
router.post('/:deviceId/poll', authMiddleware, async (req, res) => {
  // In production, this would trigger the collector
  // For now, return mock data
  const mockStatus = {
    status: 'online',
    cpu: Math.floor(Math.random() * 80) + 10,
    memory: {
      total: 65536,
      used: Math.floor(Math.random() * 50000) + 10000,
      percent: 0,
    },
    ports: [
      { name: 'eth0', status: 'up', speed: '10Gbps' },
      { name: 'eth1', status: 'up', speed: '10Gbps' },
      { name: 'eth2', status: 'down', speed: '1Gbps' },
      { name: 'iLO', status: 'up', speed: '1Gbps' },
    ],
    lastPoll: new Date().toISOString(),
  };
  mockStatus.memory.percent = Math.round((mockStatus.memory.used / mockStatus.memory.total) * 100);
  res.json(mockStatus);
});

module.exports = router;
