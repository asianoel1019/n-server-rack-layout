import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useModal } from '../../contexts/ModalContext';
import { 
  Package, Plus, Trash2, Search, Filter, History, 
  BarChart3, LayoutGrid, List, AlertCircle, TrendingUp, 
  TrendingDown, ArrowUpDown, ChevronRight, X, Check,
  Edit2
} from 'lucide-react';

export default function SparePartsPage({ initialDcId = null }) {
  const { apiFetch } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const [view, setView] = useState(initialDcId ? 'inventory' : 'dashboard');
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [movements, setMovements] = useState([]);
  const [datacenters, setDatacenters] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter states
  const [dcFilter, setDcFilter] = useState(initialDcId || '');
  const [catFilter, setCatFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form states
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showLogModal, setShowLogModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);

  const fetchData = async () => {
    try {
      const [catsRes, itemsRes, movsRes, dcsRes] = await Promise.all([
        apiFetch('/spareparts/categories'),
        apiFetch('/spareparts/items'),
        apiFetch('/spareparts/movements'),
        apiFetch('/datacenters')
      ]);
      setCategories(await catsRes.json());
      setItems(await itemsRes.json());
      setMovements(await movsRes.json());
      setDatacenters(await dcsRes.json());
    } catch (e) {
      console.error('Failed to fetch spare parts data', e);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddMovement = async (itemId, type, quantity, reason) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Check negative stock
    if (type === 'out' && item.currentStock < quantity) {
      await showAlert(`Insufficient stock. Current: ${item.currentStock} ${item.unit}`, 'Warning');
      return;
    }
    if (type === 'adjust' && quantity < 0) {
      await showAlert(`Stock cannot be negative.`, 'Warning');
      return;
    }

    const confirmed = await showConfirm(`Are you sure you want to log this ${type.toUpperCase()} movement of ${quantity} ${item.unit}?`, 'Confirm Movement');
    if (!confirmed) return;

    try {
      await apiFetch('/spareparts/movements', {
        method: 'POST',
        body: JSON.stringify({ itemId, type, quantity, reason })
      });
      setShowLogModal(false);
      fetchData();
    } catch (e) {
      console.error('Movement failed', e);
    }
  };

  const handleSaveItem = async (itemData) => {
    try {
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `/spareparts/items/${editingItem.id}` : '/spareparts/items';
      await apiFetch(url, {
        method,
        body: JSON.stringify(itemData)
      });
      setShowItemModal(false);
      setEditingItem(null);
      fetchData();
    } catch (e) {}
  };

  const handleDeleteItem = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this item?', 'Delete Item');
    if (!confirmed) return;
    try {
      await apiFetch(`/spareparts/items/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {}
  };

  const handleSaveCategory = async (name) => {
    try {
      await apiFetch('/spareparts/categories', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      fetchData();
    } catch (e) {}
  };

  const handleDeleteCategory = async (id) => {
    const confirmed = await showConfirm('Are you sure you want to delete this category?', 'Delete Category');
    if (!confirmed) return;
    try {
      await apiFetch(`/spareparts/categories/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {}
  };

  if (loading) return <div className="flex-center h-full"><div className="spinner" /></div>;

  const filteredItems = items.filter(item => {
    const matchesDc = !dcFilter || item.datacenterId === dcFilter;
    const matchesCat = !catFilter || item.categoryId === catFilter;
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.model.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesDc && matchesCat && matchesSearch;
  });

  return (
    <div className="animate-fade" style={{ padding: '24px 32px' }}>
      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid var(--c-border)', marginBottom: 24 }}>
        <button 
          onClick={() => setView('dashboard')}
          style={{ 
            padding: '12px 4px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            color: view === 'dashboard' ? 'var(--c-accent)' : 'var(--c-text-sec)',
            borderBottom: `2px solid ${view === 'dashboard' ? 'var(--c-accent)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none'
          }}>
          <BarChart3 size={18} /> Dashboard
        </button>
        <button 
          onClick={() => setView('inventory')}
          style={{ 
            padding: '12px 4px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            color: view === 'inventory' ? 'var(--c-accent)' : 'var(--c-text-sec)',
            borderBottom: `2px solid ${view === 'inventory' ? 'var(--c-accent)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none'
          }}>
          <Package size={18} /> Inventory
        </button>
        <button 
          onClick={() => setView('logs')}
          style={{ 
            padding: '12px 4px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
            color: view === 'logs' ? 'var(--c-accent)' : 'var(--c-text-sec)',
            borderBottom: `2px solid ${view === 'logs' ? 'var(--c-accent)' : 'transparent'}`,
            display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none'
          }}>
          <History size={18} /> Movement Log
        </button>
      </div>

      {view === 'dashboard' && (
        <DashboardView 
          items={items} 
          movements={movements} 
          categories={categories} 
          datacenters={datacenters} 
        />
      )}

      {view === 'inventory' && (
        <InventoryView 
          items={filteredItems}
          categories={categories}
          datacenters={datacenters}
          dcFilter={dcFilter}
          setDcFilter={setDcFilter}
          catFilter={catFilter}
          setCatFilter={setCatFilter}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onAddItem={() => { setEditingItem(null); setShowItemModal(true); }}
          onEditItem={(item) => { setEditingItem(item); setShowItemModal(true); }}
          onDeleteItem={handleDeleteItem}
          onLogMovement={(item) => { setSelectedItem(item); setShowLogModal(true); }}
          onManageCategories={() => setShowCategoryModal(true)}
        />
      )}

      {view === 'logs' && (
        <LogsView 
          movements={movements} 
          items={items} 
          datacenters={datacenters} 
        />
      )}

      {/* Modals */}
      {showItemModal && (
        <ItemModal 
          item={editingItem} 
          categories={categories} 
          datacenters={datacenters}
          onClose={() => setShowItemModal(false)} 
          onSave={handleSaveItem} 
        />
      )}

      {showLogModal && (
        <MovementModal 
          item={selectedItem} 
          onClose={() => setShowLogModal(false)} 
          onSave={handleAddMovement} 
        />
      )}

      {showCategoryModal && (
        <CategoryModal 
          categories={categories}
          onClose={() => setShowCategoryModal(false)}
          onAdd={handleSaveCategory}
          onDelete={handleDeleteCategory}
        />
      )}
    </div>
  );
}

function DashboardView({ items, movements, categories, datacenters }) {
  const totalItems = items.length;
  const lowStockItems = items.filter(i => i.currentStock < 5).length;
  const recentMovements = movements.slice(0, 5);
  
  const movementsByDay = movements.reduce((acc, m) => {
    const day = m.date.split('T')[0];
    acc[day] = (acc[day] || 0) + (m.type === 'in' ? m.quantity : -m.quantity);
    return acc;
  }, {});

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: 14, color: 'var(--c-text-sec)', fontWeight: 600 }}>Total Inventory Items</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700 }}>{totalItems}</span>
          <span style={{ color: 'var(--c-text-sec)', fontSize: 13 }}>Items across all DCs</span>
        </div>
      </div>
      
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ fontSize: 14, color: 'var(--c-text-sec)', fontWeight: 600 }}>Low Stock Alert</h3>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 700, color: lowStockItems > 0 ? '#ef4444' : 'var(--c-text)' }}>{lowStockItems}</span>
          <span style={{ color: 'var(--c-text-sec)', fontSize: 13 }}>Items with &lt; 5 units</span>
        </div>
      </div>

      <div className="card" style={{ gridColumn: '1 / -1' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Recent Activities</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {recentMovements.length > 0 ? recentMovements.map(m => {
            const item = items.find(i => i.id === m.itemId);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--c-surface2)', borderRadius: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ 
                    width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: m.type === 'in' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                    color: m.type === 'in' ? '#22c55e' : '#ef4444'
                  }}>
                    {m.type === 'in' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600 }}>{item?.name || 'Unknown Item'}</p>
                    <p style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>{m.type.toUpperCase()} - {m.quantity} {item?.unit || 'pcs'} · {m.reason}</p>
                  </div>
                </div>
                <span style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{new Date(m.date).toLocaleString()}</span>
              </div>
            );
          }) : <p style={{ textAlign: 'center', padding: '20px', color: 'var(--c-text-sec)' }}>No recent activity</p>}
        </div>
      </div>
    </div>
  );
}

function InventoryView({ 
  items, categories, datacenters, 
  dcFilter, setDcFilter, catFilter, setCatFilter, searchQuery, setSearchQuery,
  onAddItem, onEditItem, onDeleteItem, onLogMovement, onManageCategories
}) {
  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--c-text-sec)' }} />
          <input 
            className="form-input" 
            style={{ paddingLeft: 36 }} 
            placeholder="Search parts, model..." 
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <select className="form-input" style={{ width: 180 }} value={dcFilter} onChange={e => setDcFilter(e.target.value)}>
          <option value="">All Data Centers</option>
          {datacenters.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
        </select>
        <select className="form-input" style={{ width: 160 }} value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-secondary" onClick={onManageCategories} title="Manage Categories">
            <List size={16} />
          </button>
          <button className="btn-primary" onClick={onAddItem} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Plus size={16} /> Add Item
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Item Name</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Category</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Model / Specs</th>
              <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>DC</th>
              <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: 'var(--c-text-sec)' }}>Stock</th>
              <th style={{ padding: '12px 20px', textAlign: 'right', fontSize: 13, color: 'var(--c-text-sec)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length > 0 ? items.map(item => (
              <tr key={item.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontWeight: 600 }}>{item.name}</div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13 }}>
                  {categories.find(c => c.id === item.categoryId)?.name || 'Uncategorized'}
                </td>
                <td style={{ padding: '14px 20px' }}>
                  <div style={{ fontSize: 13 }}>{item.model}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{item.specs}</div>
                </td>
                <td style={{ padding: '14px 20px', fontSize: 13 }}>
                  {item.datacenterId ? datacenters.find(d => d.id === item.datacenterId)?.name : 'Global'}
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'center' }}>
                  <span style={{ 
                    padding: '4px 8px', borderRadius: 6, fontSize: 13, fontWeight: 700,
                    background: item.currentStock < 5 ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
                    color: item.currentStock < 5 ? '#ef4444' : '#22c55e'
                  }}>
                    {item.currentStock} {item.unit}
                  </span>
                </td>
                <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn-secondary" style={{ padding: '6px 8px' }} onClick={() => onLogMovement(item)} title="Movement">
                      <ArrowUpDown size={14} />
                    </button>
                    <button className="btn-secondary" style={{ padding: '6px 8px' }} onClick={() => onEditItem(item)} title="Edit">
                      <Edit2 size={14} />
                    </button>
                    <button className="btn-danger" style={{ padding: '6px 8px' }} onClick={() => onDeleteItem(item.id)} title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-sec)' }}>
                  No items found matching filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LogsView({ movements, items, datacenters }) {
  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Date</th>
            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Item</th>
            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: 'var(--c-text-sec)' }}>Type</th>
            <th style={{ padding: '12px 20px', textAlign: 'center', fontSize: 13, color: 'var(--c-text-sec)' }}>Qty</th>
            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>Reason</th>
            <th style={{ padding: '12px 20px', textAlign: 'left', fontSize: 13, color: 'var(--c-text-sec)' }}>User</th>
          </tr>
        </thead>
        <tbody>
          {movements.length > 0 ? movements.map(m => {
            const item = items.find(i => i.id === m.itemId);
            return (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--c-border)' }}>
                <td style={{ padding: '12px 20px', fontSize: 13 }}>{new Date(m.date).toLocaleString()}</td>
                <td style={{ padding: '12px 20px' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{item?.name || 'Deleted Item'}</div>
                  <div style={{ fontSize: 11, color: 'var(--c-text-sec)' }}>{item?.model}</div>
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'center' }}>
                  <span style={{ 
                    fontSize: 11, fontWeight: 700, padding: '2px 6px', borderRadius: 4, textTransform: 'uppercase',
                    background: m.type === 'in' ? 'rgba(34,197,94,0.1)' : m.type === 'out' ? 'rgba(239,68,68,0.1)' : 'rgba(59,130,246,0.1)',
                    color: m.type === 'in' ? '#22c55e' : m.type === 'out' ? '#ef4444' : '#3b82f6'
                  }}>
                    {m.type}
                  </span>
                </td>
                <td style={{ padding: '12px 20px', textAlign: 'center', fontWeight: 600 }}>{m.quantity}</td>
                <td style={{ padding: '12px 20px', fontSize: 13 }}>{m.reason}</td>
                <td style={{ padding: '12px 20px', fontSize: 13 }}>{m.user}</td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--c-text-sec)' }}>
                No movement logs found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ItemModal({ item, categories, datacenters, onClose, onSave }) {
  const [formData, setFormData] = useState(item || {
    name: '', categoryId: categories[0]?.id || '', model: '', specs: '', unit: 'pcs', datacenterId: ''
  });

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up" style={{ width: 450, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>{item ? 'Edit Spare Part' : 'Add New Spare Part'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--c-text-sec)' }}><X size={20} /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Part Name *</label>
            <input className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} autoFocus />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Category *</label>
              <select className="form-input" value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})}>
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={{ width: 100 }}>
              <label className="form-label">Unit</label>
              <input className="form-input" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="pcs" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label className="form-label">Model</label>
              <input className="form-input" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="form-label">Data Center</label>
              <select className="form-input" value={formData.datacenterId || ''} onChange={e => setFormData({...formData, datacenterId: e.target.value})}>
                <option value="">Global / Shared</option>
                {datacenters.map(dc => <option key={dc.id} value={dc.id}>{dc.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="form-label">Specifications / Notes</label>
            <textarea className="form-input" style={{ minHeight: 80, resize: 'vertical' }} value={formData.specs} onChange={e => setFormData({...formData, specs: e.target.value})} />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(formData)}>Save Part</button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MovementModal({ item, onClose, onSave }) {
  const [type, setType] = useState('in');
  const [qty, setQty] = useState(1);
  const [reason, setReason] = useState('');

  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up" style={{ width: 400, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Inventory Movement</h2>
        <div style={{ background: 'var(--c-surface2)', padding: 12, borderRadius: 8, marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: 'var(--c-text-sec)' }}>Item</p>
          <p style={{ fontWeight: 600 }}>{item.name}</p>
          <p style={{ fontSize: 12, color: 'var(--c-text-sec)' }}>Current Stock: {item.currentStock} {item.unit}</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label className="form-label">Movement Type</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {['in', 'out', 'adjust'].map(t => (
                <button key={t} onClick={() => setType(t)} style={{
                  flex: 1, padding: '8px', borderRadius: 6, fontSize: 13, fontWeight: 600, border: '1px solid var(--c-border)',
                  background: type === t ? 'var(--c-accent)' : 'transparent',
                  color: type === t ? 'white' : 'var(--c-text)',
                  textTransform: 'capitalize'
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="form-label">Quantity</label>
            <input className="form-input" type="number" min="1" value={qty} onChange={e => setQty(parseInt(e.target.value))} />
          </div>
          <div>
            <label className="form-label">Reason / Reference</label>
            <input className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. New shipment, Maintenance ticket #123" />
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            <button className="btn-primary" style={{ flex: 1 }} onClick={() => onSave(item.id, type, qty, reason)}>Submit</button>
            <button className="btn-secondary" style={{ flex: 1 }} onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ categories, onClose, onAdd, onDelete }) {
  const [newCat, setNewCat] = useState('');
  return (
    <div className="modal-overlay">
      <div className="modal-content animate-slide-up" style={{ width: 400, padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Item Categories</h2>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <input className="form-input" value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="New category name" />
          <button className="btn-primary" onClick={() => { if(newCat) { onAdd(newCat); setNewCat(''); } }}>Add</button>
        </div>
        <div style={{ maxHeight: 250, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {categories.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--c-surface2)', borderRadius: 6 }}>
              <span>{c.name}</span>
              <button onClick={() => onDelete(c.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <button className="btn-secondary" style={{ width: '100%', marginTop: 20 }} onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

