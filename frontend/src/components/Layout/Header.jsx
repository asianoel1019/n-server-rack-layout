import { useState, useEffect, useRef } from 'react';
import { Search, Bell, Settings, HelpCircle, Server, Building2, Monitor, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export default function Header({ currentPage, pageTitle, onOpenSettings, onOpenHelp, onSelectRack }) {
  const { user, logout, apiFetch } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [allData, setAllData] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const searchRef = useRef(null);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowResults(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [searchRef, userMenuRef]);

  const fetchData = async () => {
    try {
      const res = await apiFetch('/datacenters');
      const dcs = await res.json();
      setAllData(dcs);
    } catch (e) {}
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const q = query.toLowerCase();
    const matches = [];
    const isRackEditor = currentPage === 'rack-editor';

    allData.forEach(dc => {
      // Search DCs (Skip if in Rack Editor)
      if (!isRackEditor && dc.name.toLowerCase().includes(q)) {
        matches.push({ type: 'dc', id: dc.id, name: dc.name, dcId: dc.id });
      }
      
      (dc.racks || []).forEach(rack => {
        // Search Racks (Always include if match)
        if (rack.name.toLowerCase().includes(q)) {
          matches.push({ type: 'rack', id: rack.id, name: rack.name, dcId: dc.id, rackId: rack.id, dcName: dc.name });
        }

        // Search Devices (Skip if in Rack Editor)
        if (!isRackEditor) {
          (rack.devices || []).forEach(dev => {
            if (dev.name.toLowerCase().includes(q) || (dev.model && dev.model.toLowerCase().includes(q))) {
              matches.push({ 
                type: 'device', 
                id: dev.id, 
                name: dev.name, 
                model: dev.model,
                dcId: dc.id, 
                rackId: rack.id, 
                dcName: dc.name,
                rackName: rack.name
              });
            }
          });
        }
      });
    });

    setResults(matches.slice(0, 8));
  }, [query, allData, currentPage]);

  const handleSelect = (res) => {
    if (res.rackId) {
      onSelectRack(res.dcId, res.rackId);
    }
    setQuery('');
    setShowResults(false);
  };

  return (
    <div className="header shrink-0" style={{ zIndex: 100 }}>
      <h1 className="header-title">{pageTitle}</h1>

      <div className="header-search" ref={searchRef}>
        <Search size={16} />
        <input 
          type="text" 
          placeholder="Search devices, racks, or data centers..." 
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => {
            fetchData();
            setShowResults(true);
          }}
        />

        {showResults && results.length > 0 && (
          <div className="card animate-fade" style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            marginTop: 8, padding: '8px 0', maxHeight: 400, overflowY: 'auto',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)', zIndex: 1000
          }}>
            {results.map((res, i) => (
              <div 
                key={i} 
                className="search-result-item" 
                onClick={() => handleSelect(res)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 16px', cursor: 'pointer', transition: 'all 0.15s'
                }}
              >
                <div style={{ 
                  width: 32, height: 32, borderRadius: 6, 
                  background: 'var(--c-surface2)', display: 'flex', 
                  alignItems: 'center', justifyContent: 'center', color: 'var(--c-accent)'
                }}>
                  {res.type === 'dc' && <Building2 size={16} />}
                  {res.type === 'rack' && <Server size={16} />}
                  {res.type === 'device' && <Monitor size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {res.name} {res.model && <span style={{ fontWeight: 400, color: 'var(--c-text-sec)', fontSize: 11 }}>({res.model})</span>}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--c-text-sec)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {res.type === 'dc' && 'Data Center'}
                    {res.type === 'rack' && `Rack in ${res.dcName}`}
                    {res.type === 'device' && `Device in ${res.dcName} / ${res.rackName}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="header-actions">
        <button className="header-icon-btn" title="Notifications">
          <Bell size={18} />
        </button>
        
        <div style={{ position: 'relative' }} ref={userMenuRef}>
          <div 
            className="user-profile-trigger"
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '4px 8px 4px 4px', borderRadius: 20,
              cursor: 'pointer', transition: 'all 0.2s',
              background: showUserMenu ? 'var(--c-surface2)' : 'transparent'
            }}
          >
            <div className="header-avatar" style={{ margin: 0 }}>
              {user?.username?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text)', lineHeight: 1.2 }}>{user?.username}</span>
              <span style={{ fontSize: 10, color: 'var(--c-text-sec)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin</span>
            </div>
            <ChevronDown size={14} style={{ color: 'var(--c-text-sec)', transform: showUserMenu ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </div>

          {showUserMenu && (
            <div className="card animate-fade" style={{
              position: 'absolute', top: '100%', right: 0, width: 220,
              marginTop: 12, padding: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
              zIndex: 1000
            }}>
              <div style={{ padding: '8px 12px 12px', borderBottom: '1px solid var(--c-border)', marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: 'var(--c-text-sec)', marginBottom: 2 }}>Signed in as</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-text)' }}>{user?.username}</p>
              </div>

              <button className="dropdown-item" onClick={() => { onOpenSettings(); setShowUserMenu(false); }}>
                <Settings size={16} /> <span>Settings</span>
              </button>
              <button className="dropdown-item" onClick={() => { onOpenHelp(); setShowUserMenu(false); }}>
                <HelpCircle size={16} /> <span>Help Center</span>
              </button>
              
              <div style={{ margin: '8px 0', borderTop: '1px solid var(--c-border)' }} />
              
              <button className="dropdown-item" onClick={logout} style={{ color: '#ef4444' }}>
                <LogOut size={16} /> <span>Log Out</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .search-result-item:hover { background: var(--c-surface2); }
        .user-profile-trigger:hover { background: var(--c-surface2); }
        .dropdown-item {
          display: flex; align-items: center; gap: 10px; width: 100%;
          padding: 10px 12px; border: none; background: transparent;
          border-radius: 8px; cursor: pointer; color: var(--c-text);
          font-size: 13px; font-weight: 500; transition: all 0.15s;
        }
        .dropdown-item:hover { background: var(--c-surface2); }
        .dropdown-item span { flex: 1; text-align: left; }
      `}</style>
    </div>
  );
}


