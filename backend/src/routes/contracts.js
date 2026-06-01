const express = require('express');
const { getContracts, saveContracts } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');
const { logAudit } = require('../services/audit');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all contracts
router.get('/', authMiddleware, async (req, res) => {
  try {
    const contracts = await getContracts();
    res.json(contracts);
  } catch (e) {
    res.status(500).json({ error: 'Failed to retrieve contracts' });
  }
});

// Create contract
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { contractNo, name, provider, type, startDate, endDate, cost, description, deviceIds } = req.body;
    
    if (!contractNo || !name || !provider || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required contract fields' });
    }

    const contracts = await getContracts();
    
    const newContract = {
      id: uuidv4(),
      contractNo,
      name,
      provider,
      type: type || 'Warranty',
      startDate,
      endDate,
      cost: parseFloat(cost) || 0,
      description: description || '',
      deviceIds: deviceIds || [],
      createdAt: new Date().toISOString()
    };

    contracts.push(newContract);
    await saveContracts(contracts);

    // Audit log
    await logAudit(
      req.user.username, 
      'CREATE_CONTRACT', 
      `Created contract ${name} (${contractNo})`
    );

    res.status(201).json(newContract);
  } catch (e) {
    res.status(500).json({ error: 'Failed to create contract' });
  }
});

// Update contract
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { contractNo, name, provider, type, startDate, endDate, cost, description, deviceIds } = req.body;
    
    const contracts = await getContracts();
    const index = contracts.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const updatedContract = {
      ...contracts[index],
      contractNo: contractNo || contracts[index].contractNo,
      name: name || contracts[index].name,
      provider: provider || contracts[index].provider,
      type: type || contracts[index].type,
      startDate: startDate || contracts[index].startDate,
      endDate: endDate || contracts[index].endDate,
      cost: cost !== undefined ? parseFloat(cost) || 0 : contracts[index].cost,
      description: description !== undefined ? description : contracts[index].description,
      deviceIds: deviceIds || contracts[index].deviceIds
    };

    contracts[index] = updatedContract;
    await saveContracts(contracts);

    // Audit log
    await logAudit(
      req.user.username, 
      'UPDATE_CONTRACT', 
      `Updated contract ${updatedContract.name} (${updatedContract.contractNo})`
    );

    res.json(updatedContract);
  } catch (e) {
    res.status(500).json({ error: 'Failed to update contract' });
  }
});

// Delete contract
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const contracts = await getContracts();
    const index = contracts.findIndex(c => c.id === id);
    
    if (index === -1) {
      return res.status(404).json({ error: 'Contract not found' });
    }

    const removed = contracts[index];
    contracts.splice(index, 1);
    await saveContracts(contracts);

    // Audit log
    await logAudit(
      req.user.username, 
      'DELETE_CONTRACT', 
      `Deleted contract ${removed.name} (${removed.contractNo})`
    );

    res.json({ message: 'Contract deleted successfully' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete contract' });
  }
});

module.exports = router;
