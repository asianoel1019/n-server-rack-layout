import { LayoutDashboard, Server, Building2, Settings, LogOut, Network, Globe, Package, AlertTriangle, Workflow, FileSignature, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'datacenters', label: 'Data Centers', icon: Building2 },
  { id: 'rack-editor', label: 'Rack Editor', icon: Server },
  { id: 'topology', label: 'Topology Map', icon: Workflow },
  { id: 'spareparts', label: 'Spare Parts', icon: Package },
  { id: 'hardware-issues', label: 'Hardware Issues', icon: AlertTriangle },
  { id: 'contracts', label: 'Contracts & Warranties', icon: FileSignature },
  { id: 'ipam', label: 'IP Management', icon: Network },
  { id: 'dns', label: 'DNS Manager', icon: Globe },
  { id: 'ssl-certs', label: 'SSL Certificates', icon: ShieldCheck },
];

export default function Sidebar({ currentPage, onNavigate, onOpenSettings }) {
  const { user, logout } = useAuth();

  return (
    <div className="sidebar shrink-0">
      {/* Brand */}
      <div className="sidebar-brand">
        <h2>Rack Manager</h2>
        <p>Data Center Admin</p>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => onNavigate(id)}
            className={`sidebar-nav-item ${currentPage === id ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <div className="sidebar-user-avatar">
          {user?.username?.charAt(0)?.toUpperCase() || 'A'}
        </div>
        <div className="sidebar-user-info">
          <p>{user?.username || 'Admin User'}</p>
          <p>System Administrator</p>
        </div>
      </div>
    </div>
  );
}
