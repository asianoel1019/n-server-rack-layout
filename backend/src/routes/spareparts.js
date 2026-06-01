const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { 
  getSparePartsCategories, saveSparePartsCategories,
  getSparePartsItems, saveSparePartsItems,
  getSparePartsMovements, saveSparePartsMovements 
} = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// --- Categories ---
router.get('/categories', authMiddleware, async (req, res) => {
  const cats = await getSparePartsCategories();
  res.json(cats);
});

router.post('/categories', authMiddleware, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const cats = await getSparePartsCategories();
  const cat = { id: uuidv4(), name };
  cats.push(cat);
  await saveSparePartsCategories(cats);
  res.status(201).json(cat);
});

router.delete('/categories/:id', authMiddleware, async (req, res) => {
  let cats = await getSparePartsCategories();
  cats = cats.filter(c => c.id !== req.params.id);
  await saveSparePartsCategories(cats);
  res.json({ success: true });
});

// --- Items ---
router.get('/items', authMiddleware, async (req, res) => {
  const items = await getSparePartsItems();
  const { datacenterId } = req.query;
  if (datacenterId) {
    return res.json(items.filter(i => i.datacenterId === datacenterId));
  }
  res.json(items);
});

router.post('/items', authMiddleware, async (req, res) => {
  const { name, categoryId, model, specs, unit, datacenterId } = req.body;
  if (!name || !categoryId) return res.status(400).json({ error: 'Name and Category are required' });
  const items = await getSparePartsItems();
  const item = {
    id: uuidv4(),
    name,
    categoryId,
    model: model || '',
    specs: specs || '',
    unit: unit || 'pcs',
    datacenterId: datacenterId || null,
    currentStock: 0,
    createdAt: new Date().toISOString()
  };
  items.push(item);
  await saveSparePartsItems(items);
  res.status(201).json(item);
});

router.put('/items/:id', authMiddleware, async (req, res) => {
  const items = await getSparePartsItems();
  const idx = items.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });
  
  const { name, categoryId, model, specs, unit, datacenterId } = req.body;
  if (name) items[idx].name = name;
  if (categoryId) items[idx].categoryId = categoryId;
  if (model !== undefined) items[idx].model = model;
  if (specs !== undefined) items[idx].specs = specs;
  if (unit !== undefined) items[idx].unit = unit;
  if (datacenterId !== undefined) items[idx].datacenterId = datacenterId;
  
  await saveSparePartsItems(items);
  res.json(items[idx]);
});

router.delete('/items/:id', authMiddleware, async (req, res) => {
  let items = await getSparePartsItems();
  items = items.filter(i => i.id !== req.params.id);
  await saveSparePartsItems(items);
  res.json({ success: true });
});

// --- Movements ---
router.get('/movements', authMiddleware, async (req, res) => {
  const movements = await getSparePartsMovements();
  const { itemId, datacenterId } = req.query;
  let filtered = movements;
  if (itemId) filtered = filtered.filter(m => m.itemId === itemId);
  if (datacenterId) filtered = filtered.filter(m => m.datacenterId === datacenterId);
  res.json(filtered.sort((a, b) => new Date(b.date) - new Date(a.date)));
});

router.post('/movements', authMiddleware, async (req, res) => {
  const { itemId, type, quantity, reason, datacenterId } = req.body;
  if (!itemId || !type || quantity === undefined) return res.status(400).json({ error: 'Missing fields' });
  
  const movements = await getSparePartsMovements();
  const items = await getSparePartsItems();
  const itemIdx = items.findIndex(i => i.id === itemId);
  if (itemIdx === -1) return res.status(404).json({ error: 'Item not found' });

  const qty = parseInt(quantity);
  const movement = {
    id: uuidv4(),
    itemId,
    type, // 'in', 'out', 'adjust'
    quantity: qty,
    date: new Date().toISOString(),
    reason: reason || '',
    user: req.user.username,
    datacenterId: datacenterId || items[itemIdx].datacenterId
  };

  movements.push(movement);
  await saveSparePartsMovements(movements);

  // Update item stock
  if (type === 'in') {
    items[itemIdx].currentStock += qty;
  } else if (type === 'out') {
    if (items[itemIdx].currentStock < qty) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }
    items[itemIdx].currentStock -= qty;
  } else if (type === 'adjust') {
    if (qty < 0) return res.status(400).json({ error: 'Stock cannot be negative' });
    items[itemIdx].currentStock = qty;
  }

  await saveSparePartsItems(items);

  res.status(201).json(movement);
});

module.exports = router;
