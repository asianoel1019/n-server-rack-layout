const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDnsRecords, saveDnsRecords } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/dns
router.get('/', authMiddleware, async (req, res) => {
  const records = await getDnsRecords();
  res.json(records);
});

// POST /api/dns
router.post('/', authMiddleware, async (req, res) => {
  const { fqdn, type, value, ttl, description } = req.body;
  if (!fqdn || !type || !value) return res.status(400).json({ error: 'FQDN, Type and Value required' });
  
  const records = await getDnsRecords();
  const newRecord = {
    id: uuidv4(),
    fqdn,
    type, // A, AAAA, CNAME, PTR
    value,
    ttl: ttl || 3600,
    status: 'active',
    lastChecked: new Date().toISOString(),
    description: description || '',
    createdAt: new Date().toISOString()
  };
  
  records.push(newRecord);
  await saveDnsRecords(records);
  res.status(201).json(newRecord);
});

// DELETE /api/dns/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  let records = await getDnsRecords();
  records = records.filter(r => r.id !== req.params.id);
  await saveDnsRecords(records);
  res.json({ success: true });
});

// PUT /api/dns/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const records = await getDnsRecords();
  const idx = records.findIndex(r => r.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Record not found' });
  
  const { fqdn, type, value, ttl, description } = req.body;
  if (fqdn) records[idx].fqdn = fqdn;
  if (type) records[idx].type = type;
  if (value) records[idx].value = value;
  if (ttl) records[idx].ttl = ttl;
  if (description !== undefined) records[idx].description = description;
  
  records[idx].lastChecked = new Date().toISOString();
  
  await saveDnsRecords(records);
  res.json(records[idx]);
});

// POST /api/dns/test
router.post('/test', authMiddleware, async (req, res) => {
  const { fqdn } = req.body;
  const records = await getDnsRecords();
  const record = records.find(r => r.fqdn === fqdn);
  
  // Simulate DNS resolution
  setTimeout(() => {
    if (record) {
      res.json({
        fqdn: record.fqdn,
        resolvedIp: record.value,
        ttl: record.ttl,
        dnsServer: '10.0.0.53 (Internal)',
        resolveTime: '12ms',
        ptrMatch: true,
        healthStatus: 'Healthy',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({ error: 'FQDN not found in local records' });
    }
  }, 500); // Add small delay for realistic feel
});

module.exports = router;
