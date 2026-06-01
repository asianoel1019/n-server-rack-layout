const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getEnvironments, saveEnvironments } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// GET /api/environments
router.get('/', authMiddleware, async (req, res) => {
  const envs = await getEnvironments();
  res.json(envs);
});

// POST /api/environments
router.post('/', authMiddleware, async (req, res) => {
  const { name, purpose } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  
  const envs = await getEnvironments();
  const newEnv = {
    id: uuidv4(),
    name,
    purpose: purpose || '',
    createdAt: new Date().toISOString(),
  };
  
  envs.push(newEnv);
  await saveEnvironments(envs);
  res.status(201).json(newEnv);
});

// DELETE /api/environments/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  let envs = await getEnvironments();
  envs = envs.filter(e => e.id !== req.params.id);
  await saveEnvironments(envs);
  res.json({ success: true });
});

module.exports = router;
