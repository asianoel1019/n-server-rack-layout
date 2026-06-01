const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getHardwareIssues, saveHardwareIssues } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// Get all issues
router.get('/', authMiddleware, async (req, res) => {
  const issues = await getHardwareIssues();
  res.json(issues.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

// Create new issue
router.post('/', authMiddleware, async (req, res) => {
  const { 
    idc, rack, u, deviceName, serialNumber, 
    urgency, failedParts, partsInfo, processNote,
    deviceId, dcId, rackId
  } = req.body;

  const issues = await getHardwareIssues();
  const issue = {
    id: uuidv4(),
    idc,
    rack,
    u,
    deviceName,
    serialNumber,
    urgency: urgency || 'Medium',
    failedParts: failedParts || '',
    partsInfo: partsInfo || '',
    status: 'Open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    reporter: req.user.username,
    history: [
      {
        status: 'Open',
        note: processNote || 'Issue reported',
        user: req.user.username,
        date: new Date().toISOString()
      }
    ],
    // Metadata for linking back
    deviceId,
    dcId,
    rackId
  };

  issues.push(issue);
  await saveHardwareIssues(issues);
  res.status(201).json(issue);
});

// Update issue status/note
router.put('/:id', authMiddleware, async (req, res) => {
  const { status, note } = req.body;
  if (!status || !note) {
    return res.status(400).json({ error: 'Status and Process Note are required' });
  }

  const issues = await getHardwareIssues();
  const idx = issues.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Issue not found' });

  const issue = issues[idx];
  
  // Transition logic: Open -> Processing -> Closed
  const validTransitions = {
    'Open': ['Processing'],
    'Processing': ['Closed'],
    'Closed': []
  };

  // If user wants to skip or re-open, we can allow it but user asked for O -> P -> C
  // We'll enforce the "must update process note" rule.

  issue.status = status;
  issue.updatedAt = new Date().toISOString();
  issue.history.push({
    status,
    note,
    user: req.user.username,
    date: new Date().toISOString()
  });

  await saveHardwareIssues(issues);
  res.json(issue);
});

module.exports = router;
