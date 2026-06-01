const { getAuditLogs, saveAuditLogs } = require('./storage');
const { v4: uuidv4 } = require('uuid');

const MAX_LOG_ENTRIES = parseInt(process.env.AUDIT_LOG_MAX) || 500;

async function logAudit(username, actionType, details) {
  try {
    const logs = await getAuditLogs();
    const entry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      username: username || 'system',
      actionType,
      details,
    };
    logs.unshift(entry);
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.length = MAX_LOG_ENTRIES;
    }
    await saveAuditLogs(logs);
  } catch (e) {
    console.error('Failed to log audit event:', e);
  }
}

module.exports = { logAudit };
