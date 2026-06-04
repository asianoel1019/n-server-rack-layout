import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ModalProvider } from './contexts/ModalContext';
import LoginPage from './components/Auth/LoginPage';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import SettingsModal from './components/Settings/SettingsModal';
import HelpModal from './components/Layout/HelpModal';
import DashboardPage from './components/Dashboard/DashboardPage';
import DataCenterList from './components/DataCenter/DataCenterList';
import RackEditor from './components/Rack/RackEditor';
import IPInventoryPage from './components/IPAM/IPInventoryPage';
import DNSManagementPage from './components/DNS/DNSManagementPage';
import SparePartsPage from './components/SpareParts/SparePartsPage';
import HardwareIssuesPage from './components/HardwareIssues/HardwareIssuesPage';
import TopologyPage from './components/Topology/TopologyPage';
import ContractPage from './components/Contract/ContractPage';
import SSLCertificatePage from './components/SSL/SSLCertificatePage';
import ErrorBoundary from './components/ErrorBoundary';
import { useWebSocket } from './hooks/useWebSocket';


function AppContent() {
  const { user, loading } = useAuth();
  const { deviceStatus, connected } = useWebSocket();
  const [page, setPage] = useState('dashboard');
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [selectedDcId, setSelectedDcId] = useState(null);
  const [selectedRackId, setSelectedRackId] = useState(null);
  const [autoOpenDeviceId, setAutoOpenDeviceId] = useState(null);
  const [returnToPage, setReturnToPage] = useState(null);

  const pageTitles = {
    dashboard: 'Dashboard',
    datacenters: 'Data Centers',
    'rack-editor': 'Rack Editor',
    topology: 'Network Topology Map',
    ipam: 'IP Management',
    dns: 'DNS Manager',
    spareparts: 'Spare Parts Inventory',
    contracts: 'Contracts & Warranties',
    'ssl-certs': 'SSL Certificate Management',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--c-primary)' }}>
        <div className="w-10 h-10 border-3 border-accent/30 border-t-accent rounded-full" style={{ animation: 'spin 0.6s linear infinite' }} />
      </div>
    );
  }

  if (!user) return <LoginPage />;

  const handleSelectRack = (dcId, rackId, deviceId = null, returnPage = null) => {
    setSelectedDcId(dcId);
    setSelectedRackId(rackId);
    setAutoOpenDeviceId(deviceId);
    setReturnToPage(returnPage);
    setPage('rack-editor');
  };

  const handleSaveFinished = () => {
    if (returnToPage) {
      setPage(returnToPage);
      setReturnToPage(null);
    }
  };

  const handleNavigateSpareParts = (dcId) => {
    setSelectedDcId(dcId);
    setPage('spareparts');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar
        currentPage={page}
        onNavigate={(p) => {
          if (p === 'spareparts') setSelectedDcId(null);
          setPage(p);
        }}
        onOpenSettings={() => setShowSettings(true)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Header 
          currentPage={page}
          pageTitle={pageTitles[page] || 'Dashboard'} 
          onOpenSettings={() => setShowSettings(true)} 
          onOpenHelp={() => setShowHelp(true)}
          onSelectRack={handleSelectRack}
        />
        <main style={{ flex: 1, overflow: 'auto', background: 'var(--c-primary)' }}>
          {page === 'dashboard' && <DashboardPage deviceStatus={deviceStatus} onSelectRack={handleSelectRack} />}
          {page === 'datacenters' && <DataCenterList onSelectRack={handleSelectRack} onNavigateSpareParts={handleNavigateSpareParts} />}
          {page === 'rack-editor' && (
            <RackEditor 
              selectedDcId={selectedDcId} 
              selectedRackId={selectedRackId} 
              deviceStatus={deviceStatus} 
              autoOpenDeviceId={autoOpenDeviceId} 
              onClearAutoOpen={() => setAutoOpenDeviceId(null)} 
              onSaveFinished={handleSaveFinished}
              onChangeRack={(rackId) => setSelectedRackId(rackId)}
            />
          )}
          {page === 'ipam' && <IPInventoryPage />}
          {page === 'topology' && <TopologyPage onSelectRack={handleSelectRack} />}
          {page === 'dns' && <DNSManagementPage />}
          {page === 'spareparts' && <SparePartsPage initialDcId={selectedDcId} />}
          {page === 'hardware-issues' && <HardwareIssuesPage />}
          {page === 'contracts' && <ContractPage />}
          {page === 'ssl-certs' && <SSLCertificatePage />}
        </main>
      </div>
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <ModalProvider>
            <AppContent />
          </ModalProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
