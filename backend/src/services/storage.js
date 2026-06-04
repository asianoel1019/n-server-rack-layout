const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) { /* exists */ }
}

async function readJSON(filename) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
}

async function writeJSON(filename, data) {
  await ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  const tmpPath = filePath + '.tmp';
  // Create backup
  try {
    const existing = await fs.readFile(filePath, 'utf-8');
    if (existing) {
      const backupPath = filePath + '.bak';
      await fs.writeFile(backupPath, existing, 'utf-8');
    }
  } catch (e) { /* no existing file */ }
  // Atomic write: write to temp file first, then rename
  await fs.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fsSync.renameSync(tmpPath, filePath);
  return data;
}

async function getUsers() {
  return (await readJSON('users.json')) || [];
}

async function saveUsers(users) {
  return writeJSON('users.json', users);
}

async function getDatacenters() {
  return (await readJSON('datacenters.json')) || [];
}

async function saveDatacenters(datacenters) {
  return writeJSON('datacenters.json', datacenters);
}

async function getDeviceStatus() {
  return (await readJSON('device_status.json')) || {};
}

async function saveDeviceStatus(status) {
  return writeJSON('device_status.json', status);
}

async function getSubnets() {
  return (await readJSON('subnets.json')) || [];
}

async function saveSubnets(subnets) {
  return writeJSON('subnets.json', subnets);
}

async function getDnsRecords() {
  return (await readJSON('dns_records.json')) || [];
}

async function saveDnsRecords(records) {
  return writeJSON('dns_records.json', records);
}

async function getSparePartsCategories() {
  return (await readJSON('spare_parts_categories.json')) || [];
}

async function saveSparePartsCategories(categories) {
  return writeJSON('spare_parts_categories.json', categories);
}

async function getSparePartsItems() {
  return (await readJSON('spare_parts_items.json')) || [];
}

async function saveSparePartsItems(items) {
  return writeJSON('spare_parts_items.json', items);
}

async function getSparePartsMovements() {
  return (await readJSON('spare_parts_movements.json')) || [];
}

async function saveSparePartsMovements(movements) {
  return writeJSON('spare_parts_movements.json', movements);
}

async function getHardwareIssues() {
  return (await readJSON('hardware_issues.json')) || [];
}

async function saveHardwareIssues(issues) {
  return writeJSON('hardware_issues.json', issues);
}

async function getEnvironments() {
  return (await readJSON('environments.json')) || [
    { id: '1', name: 'Production', purpose: 'Live production servers' },
    { id: '2', name: 'UAT', purpose: 'User acceptance testing' },
    { id: '3', name: 'Development', purpose: 'Development and sandbox' }
  ];
}

async function saveEnvironments(environments) {
  return writeJSON('environments.json', environments);
}

async function getAuditLogs() {
  return (await readJSON('audit_logs.json')) || [];
}

async function saveAuditLogs(logs) {
  return writeJSON('audit_logs.json', logs);
}

async function getConnections() {
  return (await readJSON('connections.json')) || [];
}

async function saveConnections(connections) {
  return writeJSON('connections.json', connections);
}

async function getContracts() {
  return (await readJSON('contracts.json')) || [];
}

async function saveContracts(contracts) {
  return writeJSON('contracts.json', contracts);
}

async function getCertificates() {
  return (await readJSON('certificates.json')) || [];
}

async function saveCertificates(certificates) {
  return writeJSON('certificates.json', certificates);
}

module.exports = {
  readJSON,
  writeJSON,
  getUsers,
  saveUsers,
  getDatacenters,
  saveDatacenters,
  getDeviceStatus,
  saveDeviceStatus,
  getSubnets,
  saveSubnets,
  getDnsRecords,
  saveDnsRecords,
  getSparePartsCategories,
  saveSparePartsCategories,
  getSparePartsItems,
  saveSparePartsItems,
  getSparePartsMovements,
  saveSparePartsMovements,
  getHardwareIssues,
  saveHardwareIssues,
  getEnvironments,
  saveEnvironments,
  getAuditLogs,
  saveAuditLogs,
  getConnections,
  saveConnections,
  getContracts,
  saveContracts,
  getCertificates,
  saveCertificates,
};
