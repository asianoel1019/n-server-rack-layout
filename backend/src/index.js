require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
const path = require('path');

const authRoutes = require('./routes/auth');
const datacenterRoutes = require('./routes/datacenters');
const monitorRoutes = require('./routes/monitor');
const subnetRoutes = require('./routes/subnets');
const dnsRoutes = require('./routes/dns');
const sparepartsRoutes = require('./routes/spareparts');
const hardwareIssuesRoutes = require('./routes/hardwareissues');
const environmentRoutes = require('./routes/environments');
const auditRoutes = require('./routes/audit');
const connectionRoutes = require('./routes/connections');
const discoveryRoutes = require('./routes/discovery');
const topologyRoutes = require('./routes/topology');
const contractRoutes = require('./routes/contracts');
const certificateRoutes = require('./routes/certificates');
const deviceMonitor = require('./services/deviceMonitor');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3081;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/datacenters', datacenterRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/subnets', subnetRoutes);
app.use('/api/dns', dnsRoutes);
app.use('/api/spareparts', sparepartsRoutes);
app.use('/api/hardware-issues', hardwareIssuesRoutes);
app.use('/api/environments', environmentRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/discovery', discoveryRoutes);
app.use('/api/topology', topologyRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/certificates', certificateRoutes);

// System info
app.get('/api/system/info', (req, res) => {
  res.json({
    version: process.env.SYSTEM_VERSION || 'v1.0.0',
    authorEmail: process.env.AUTHOR_EMAIL || 'admin@example.com'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('error', (err) => {
  console.error('WebSocket Server Error:', err);
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  
  ws.on('error', (err) => {
    console.error('WebSocket Socket Error:', err);
  });

  deviceMonitor.addWSClient(ws);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server Rack Layout API running on port ${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}/ws`);

  // Start device monitoring
  deviceMonitor.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  deviceMonitor.stop();
  server.close();
});
