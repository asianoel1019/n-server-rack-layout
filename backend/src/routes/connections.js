const express = require('express');
const { getConnections, saveConnections } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all connections
router.get('/', authMiddleware, async (req, res) => {
  try {
    const conns = await getConnections();
    res.json(conns);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve connections' });
  }
});

// Create connection
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { fromDeviceId, fromDeviceName, fromPort, toDeviceId, toDeviceName, toPort, cableType, cableColor } = req.body;
    
    if (!fromDeviceId || !fromPort || !toDeviceId || !toPort) {
      return res.status(400).json({ error: 'Missing required connection details' });
    }

    const conns = await getConnections();
    
    // Check if the connection from/to ports already exists
    const duplicate = conns.find(c => 
      (c.fromDeviceId === fromDeviceId && c.fromPort === fromPort) ||
      (c.toDeviceId === fromDeviceId && c.toPort === fromPort) ||
      (c.fromDeviceId === toDeviceId && c.fromPort === toPort) ||
      (c.toDeviceId === toDeviceId && c.toPort === toPort)
    );

    if (duplicate) {
      return res.status(400).json({ error: 'One or both of these ports are already connected.' });
    }

    const newConn = {
      id: uuidv4(),
      fromDeviceId,
      fromDeviceName: fromDeviceName || 'Device',
      fromPort,
      toDeviceId,
      toDeviceName: toDeviceName || 'Device',
      toPort,
      cableType: cableType || 'CAT6',
      cableColor: cableColor || '#3b82f6',
      createdAt: new Date().toISOString()
    };

    conns.push(newConn);
    await saveConnections(conns);

    // Audit log
    await logAudit(
      req.user.username, 
      'CREATE_CONNECTION', 
      `Connected ${fromDeviceName || 'Device'} [${fromPort}] to ${toDeviceName || 'Device'} [${toPort}]`
    );

    res.status(201).json(newConn);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create connection' });
  }
});

// Delete connection
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const conns = await getConnections();
    const index = conns.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    const removed = conns[index];
    conns.splice(index, 1);
    await saveConnections(conns);

    // Audit log
    await logAudit(
      req.user.username, 
      'DELETE_CONNECTION', 
      `Disconnected ${removed.fromDeviceName} [${removed.fromPort}] and ${removed.toDeviceName} [${removed.toPort}]`
    );

    res.json({ message: 'Connection deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete connection' });
  }
});

module.exports = router;
