const express = require('express');
const { getAuditLogs } = require('../services/storage');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  let logs = await getAuditLogs();
  const limit = parseInt(req.query.limit) || logs.length;
  if (limit > 0 && limit < logs.length) {
    logs = logs.slice(0, limit);
  }
  res.json(logs);
});

module.exports = router;
