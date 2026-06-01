// Device type definitions with display info grouped by requested categories
export const DEVICE_CATEGORIES = [
  'Compute',
  'Network',
  'Storage',
  'Power',
  'Others'
];

export const DEVICE_TYPES = {
  // Compute
  server: {
    label: 'Server',
    defaultHeight: 2,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #1e3a5f, #2563eb)',
    icon: '🖥️',
    category: 'Compute',
  },
  blade: {
    label: 'Blade Server',
    defaultHeight: 7,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #312e81, #6366f1)',
    icon: '🗄️',
    category: 'Compute',
    isMultiNode: true,
  },
  nutanix: {
    label: 'Nutanix Server',
    defaultHeight: 2,
    color: '#34d399',
    gradient: 'linear-gradient(135deg, #064e3b, #34d399)',
    icon: '📦',
    category: 'Compute',
    isMultiNode: true,
  },
  gpu: {
    label: 'GPU Server',
    defaultHeight: 4,
    color: '#8b5cf6',
    gradient: 'linear-gradient(135deg, #4c1d95, #8b5cf6)',
    icon: '🚀',
    category: 'Compute',
  },

  // Network
  firewall: {
    label: 'Firewall',
    defaultHeight: 1,
    color: '#ef4444',
    gradient: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
    icon: '🛡️',
    category: 'Network',
  },
  router: {
    label: 'Router',
    defaultHeight: 1,
    color: '#0ea5e9',
    gradient: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
    icon: '🌐',
    category: 'Network',
  },
  switch: {
    label: 'Switch',
    defaultHeight: 1,
    color: '#14b8a6',
    gradient: 'linear-gradient(135deg, #134e4a, #14b8a6)',
    icon: '🔀',
    category: 'Network',
  },
  loadbalancer: {
    label: 'Load Balancer',
    defaultHeight: 1,
    color: '#a855f7',
    gradient: 'linear-gradient(135deg, #581c87, #a855f7)',
    icon: '⚖️',
    category: 'Network',
  },
  proxy: {
    label: 'Proxy',
    defaultHeight: 1,
    color: '#6366f1',
    gradient: 'linear-gradient(135deg, #3730a3, #6366f1)',
    icon: '🔗',
    category: 'Network',
  },

  // Storage
  nas: {
    label: 'NAS',
    defaultHeight: 2,
    color: '#f59e0b',
    gradient: 'linear-gradient(135deg, #78350f, #f59e0b)',
    icon: '💾',
    category: 'Storage',
  },
  san: {
    label: 'SAN',
    defaultHeight: 3,
    color: '#d97706',
    gradient: 'linear-gradient(135deg, #92400e, #d97706)',
    icon: '💿',
    category: 'Storage',
  },
  storage: {
    label: 'Storage Array',
    defaultHeight: 4,
    color: '#b45309',
    gradient: 'linear-gradient(135deg, #78350f, #b45309)',
    icon: '🏗️',
    category: 'Storage',
  },

  // Power
  pdu: {
    label: 'PDU',
    defaultHeight: 1,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #064e3b, #10b981)',
    icon: '🔌',
    category: 'Power',
  },
  ups: {
    label: 'UPS',
    defaultHeight: 2,
    color: '#059669',
    gradient: 'linear-gradient(135deg, #064e3b, #059669)',
    icon: '🔋',
    category: 'Power',
  },
  psu: {
    label: 'PSU',
    defaultHeight: 1,
    color: '#047857',
    gradient: 'linear-gradient(135deg, #064e3b, #047857)',
    icon: '⚡',
    category: 'Power',
  },

  // Others
  patchpanel: {
    label: 'Patch Panel',
    defaultHeight: 1,
    color: '#6b7280',
    gradient: 'linear-gradient(135deg, #374151, #6b7280)',
    icon: '🧷',
    category: 'Others',
  },
  kvm: {
    label: 'KVM',
    defaultHeight: 1,
    color: '#4b5563',
    gradient: 'linear-gradient(135deg, #1f2937, #4b5563)',
    icon: '⌨️',
    category: 'Others',
  },
  monitor: {
    label: 'Monitor',
    defaultHeight: 1,
    color: '#374151',
    gradient: 'linear-gradient(135deg, #111827, #374151)',
    icon: '📺',
    category: 'Others',
  },
  shelves: {
    label: 'Shelves',
    defaultHeight: 1,
    color: '#9ca3af',
    gradient: 'linear-gradient(135deg, #4b5563, #9ca3af)',
    icon: '🍱',
    category: 'Others',
  },
};


