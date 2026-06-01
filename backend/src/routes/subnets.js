const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getSubnets, saveSubnets } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Helper to expand /24 subnet (simpler for now)
function generateIPs(cidr) {
  const [base, mask] = cidr.split('/');
  if (mask !== '24') return []; // Only support /24 for now for simplicity
  const parts = base.split('.');
  const ips = [];
  for (let i = 1; i < 255; i++) {
    ips.push({
      address: `${parts[0]}.${parts[1]}.${parts[2]}.${i}`,
      status: 'free',
      hostname: '',
      fqdn: '',
      assignedTo: '',
      environment: 'Production',
      service: '',
      updatedAt: new Date().toISOString(),
      tags: []
    });
  }
  return ips;
}

// GET /api/subnets
router.get('/', authMiddleware, async (req, res) => {
  const subnets = await getSubnets();
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.json(subnets);
});

// POST /api/subnets
router.post('/', authMiddleware, async (req, res) => {
  const { name, cidr, vlan, region, environment } = req.body;
  if (!name || !cidr) return res.status(400).json({ error: 'Name and CIDR required' });
  
  const subnets = await getSubnets();
  if (subnets.some(s => s.cidr === cidr)) {
    return res.status(400).json({ error: 'Subnet with this CIDR already exists' });
  }
  const newSubnet = {
    id: uuidv4(),
    name,
    cidr,
    vlan: vlan || '',
    region: region || '',
    environment: environment || 'Production',
    ips: generateIPs(cidr),
    createdAt: new Date().toISOString(),
  };
  
  subnets.push(newSubnet);
  await saveSubnets(subnets);
  res.status(201).json(newSubnet);
});

// POST /api/subnets/batch
router.post('/batch', authMiddleware, async (req, res) => {
  const { subnets: list } = req.body;
  if (!Array.isArray(list)) return res.status(400).json({ error: 'List of subnets required' });
  
  const subnets = await getSubnets();
  const added = [];
  
  for (const s of list) {
    if (subnets.some(existing => existing.cidr === s.cidr)) continue;
    const newSubnet = {
      id: uuidv4(),
      name: s.name,
      cidr: s.cidr,
      vlan: s.vlan || '',
      environment: s.environment || 'Production',
      ips: generateIPs(s.cidr),
      createdAt: new Date().toISOString(),
    };
    subnets.push(newSubnet);
    added.push(newSubnet);
  }
  
  await saveSubnets(subnets);
  res.status(201).json({ added: added.length, total: subnets.length, received: list.length });
});

// GET /api/subnets/:id
router.get('/:id', authMiddleware, async (req, res) => {
  const subnets = await getSubnets();
  const subnet = subnets.find(s => s.id === req.params.id);
  if (!subnet) return res.status(404).json({ error: 'Subnet not found' });
  res.json(subnet);
});

// GET /api/subnets/:id/next-available
router.get('/:id/next-available', authMiddleware, async (req, res) => {
  const subnets = await getSubnets();
  const subnet = subnets.find(s => s.id === req.params.id);
  if (!subnet) return res.status(404).json({ error: 'Subnet not found' });
  
  const nextIp = subnet.ips.find(ip => ip.status === 'free');
  if (!nextIp) return res.status(404).json({ error: 'No available IPs in this subnet' });
  
  res.json(nextIp);
});

// PUT /api/subnets/:id/ips
router.put('/:id/ips', authMiddleware, async (req, res) => {
  const { address, status, hostname, fqdn, assignedTo, service, environment, tags } = req.body;
  const subnets = await getSubnets();
  const sIdx = subnets.findIndex(s => s.id === req.params.id);
  if (sIdx === -1) return res.status(404).json({ error: 'Subnet not found' });
  
  const ipIdx = subnets[sIdx].ips.findIndex(ip => ip.address === address);
  if (ipIdx === -1) return res.status(404).json({ error: 'IP address not found in this subnet' });
  
  subnets[sIdx].ips[ipIdx] = {
    ...subnets[sIdx].ips[ipIdx],
    status: status || 'used',
    hostname: hostname || '',
    fqdn: fqdn || '',
    assignedTo: assignedTo || '',
    service: service || '',
    environment: environment || subnets[sIdx].environment,
    tags: tags || [],
    updatedAt: new Date().toISOString()
  };
  
  await saveSubnets(subnets);

  // ✅ Auto-sync with DNS Manager
  if (fqdn && status === 'used') {
    const { getDnsRecords, saveDnsRecords } = require('../services/storage');
    const { v4: uuidv4 } = require('uuid');
    let dnsRecords = await getDnsRecords();
    const existingIdx = dnsRecords.findIndex(r => r.fqdn === fqdn);
    
    if (existingIdx !== -1) {
      dnsRecords[existingIdx].value = address;
      dnsRecords[existingIdx].lastChecked = new Date().toISOString();
    } else {
      dnsRecords.push({
        id: uuidv4(),
        fqdn,
        type: 'A',
        value: address,
        ttl: 3600,
        status: 'active',
        lastChecked: new Date().toISOString(),
        description: `Auto-synced from IPAM (${hostname || 'No Hostname'})`,
        createdAt: new Date().toISOString()
      });
    }
    await saveDnsRecords(dnsRecords);
  }

  res.json(subnets[sIdx].ips[ipIdx]);
});

// PUT /api/subnets/batch
router.put('/batch', authMiddleware, async (req, res) => {
  const { updates } = req.body; // Array of { id, name, vlan, environment }
  if (!Array.isArray(updates)) return res.status(400).json({ error: 'List of updates required' });
  
  const subnets = await getSubnets();
  let count = 0;
  
  for (const update of updates) {
    const idx = subnets.findIndex(s => s.id === update.id);
    if (idx !== -1) {
      console.log(`Updating subnet ${subnets[idx].cidr}: ${subnets[idx].name} -> ${update.name}`);
      if (update.name !== undefined) subnets[idx].name = update.name;
      if (update.vlan !== undefined) subnets[idx].vlan = update.vlan;
      if (update.environment !== undefined) subnets[idx].environment = update.environment;
      if (update.ips !== undefined && Array.isArray(update.ips) && update.ips.length > 0) {
        console.log(`Overwriting ${update.ips.length} IPs for subnet ${subnets[idx].cidr}`);
        subnets[idx].ips = update.ips;
      } else {
        console.log(`Skipping IP overwrite for subnet ${subnets[idx].cidr} (no IPs in import)`);
      }
      subnets[idx].lastUpdated = new Date().toISOString();
      count++;
    }
  }
  
  await saveSubnets(subnets);
  res.json({ updated: count, message: `Successfully updated ${count} subnets` });
});

// PUT /api/subnets/:id
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, vlan, environment } = req.body;
  const subnets = await getSubnets();
  const idx = subnets.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Subnet not found' });
  
  if (name !== undefined) subnets[idx].name = name;
  if (vlan !== undefined) subnets[idx].vlan = vlan;
  if (environment !== undefined) subnets[idx].environment = environment;
  if (req.body.ips !== undefined && Array.isArray(req.body.ips) && req.body.ips.length > 0) {
    subnets[idx].ips = req.body.ips;
  }
  
  await saveSubnets(subnets);
  res.json(subnets[idx]);
});

// DELETE /api/subnets/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  let subnets = await getSubnets();
  subnets = subnets.filter(s => s.id !== req.params.id);
  await saveSubnets(subnets);
  res.json({ success: true });
});

module.exports = router;
