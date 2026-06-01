/**
 * Device Monitor Service
 * Orchestrates SNMP and SSH collectors, maintains status cache,
 * and pushes updates via WebSocket.
 */

const { collectSNMP, generateMockData } = require('./snmpCollector');
const { collectSSH, generateMockSSHData } = require('./sshCollector');
const { getDatacenters, getDeviceStatus, saveDeviceStatus } = require('./storage');

class DeviceMonitor {
  constructor() {
    this.wsClients = new Set();
    this.statusCache = {};
    this.pollInterval = null;
    this.pollIntervalMs = 60000; // 60 seconds default
  }

  addWSClient(ws) {
    this.wsClients.add(ws);
    ws.on('close', () => this.wsClients.delete(ws));
    // Send current status on connect
    try {
      ws.send(JSON.stringify({ type: 'status_update', data: this.statusCache }));
    } catch (e) {}
  }

  broadcast(data) {
    const message = JSON.stringify(data);
    this.wsClients.forEach((ws) => {
      try {
        if (ws.readyState === 1) { // OPEN
          ws.send(message);
        }
      } catch (e) {
        this.wsClients.delete(ws);
      }
    });
  }

  async start() {
    console.log(`Device monitor starting (poll interval: ${this.pollIntervalMs / 1000}s)`);
    // Load cached status
    this.statusCache = await getDeviceStatus() || {};

    // Initial poll
    await this.pollAll();

    // Periodic polling
    this.pollInterval = setInterval(() => this.pollAll(), this.pollIntervalMs);
  }

  stop() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  async pollAll() {
    try {
      const datacenters = await getDatacenters();
      const allDevices = [];

      datacenters.forEach((dc) => {
        (dc.racks || []).forEach((rack) => {
          (rack.devices || []).forEach((device) => {
            allDevices.push({
              ...device,
              datacenterId: dc.id,
              rackId: rack.id,
            });
          });
        });
      });

      for (const device of allDevices) {
        try {
          let result;
          const protocol = device.monitoring?.protocol || 'none';

          if (protocol === 'snmp') {
            result = await collectSNMP(device);
          } else if (protocol === 'ssh') {
            result = await collectSSH(device);
          } else {
            result = generateMockData(device);
          }

          if (result.memory && result.memory.total > 0) {
            result.memory.percent = Math.round((result.memory.used / result.memory.total) * 100);
          }

          this.statusCache[device.id] = result;
        } catch (e) {
          console.error(`Error polling device ${device.name}:`, e.message);
          this.statusCache[device.id] = {
            status: 'error',
            cpu: null,
            memory: { total: 0, used: 0, percent: 0 },
            ports: [],
            lastPoll: new Date().toISOString(),
            error: e.message,
          };
        }
      }

      // Save status and broadcast
      await saveDeviceStatus(this.statusCache);
      this.broadcast({ type: 'status_update', data: this.statusCache });
    } catch (e) {
      console.error('Poll all error:', e);
    }
  }

  getStatus(deviceId) {
    return this.statusCache[deviceId] || null;
  }

  getAllStatus() {
    return this.statusCache;
  }
}

module.exports = new DeviceMonitor();
