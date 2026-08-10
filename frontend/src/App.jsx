import React, { useState, useEffect } from 'react';
import { api } from './utils/api';
import Login from './components/Login';
import TopologyMap from './components/TopologyMap';
import SidePanel from './components/SidePanel';
import AuditLogs from './components/AuditLogs';
import Settings from './components/Settings';
import DeviceRegistry from './components/DeviceRegistry';
import { 
  Network, 
  ShieldAlert, 
  Settings as SettingsIcon, 
  LogOut, 
  Sun, 
  Moon, 
  Plus, 
  RefreshCw,
  Search,
  Wifi,
  WifiOff,
  Database
} from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("React Component Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', backgroundColor: '#090d16', color: '#f8fafc', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', color: '#f43f5e', marginBottom: '1rem' }}>⚠️ Application Error Detected</h2>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem', maxWidth: '500px' }}>
            A component error occurred while rendering. We have safely caught it to prevent a blank screen.
          </p>
          <button 
            className="btn btn-primary"
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [currentView, setCurrentView] = useState('dashboard'); // dashboard | logs | settings
  
  // Data State
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [loadingDevices, setLoadingDevices] = useState(false);
  const [scanning, setScanning] = useState(false);
  
  // Scan Results State
  const [scanResults, setScanResults] = useState([]);
  const [showScanResultsModal, setShowScanResultsModal] = useState(false);
  const [savingScan, setSavingScan] = useState(false);
  
  // Add Device Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newIp, setNewIp] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('PC');
  const [newLocation, setNewLocation] = useState('Bar');
  const [addError, setAddError] = useState('');

  // Initial Boot
  useEffect(() => {
    const user = api.getCurrentUser();
    if (user) {
      setCurrentUser(user);
    }
    
    // Check saved theme or system theme
    const savedTheme = localStorage.getItem('veyla_theme') || 'dark';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadDevices();
      
      // Auto-poll devices status every 15 seconds
      const interval = setInterval(loadDevices, 15000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const loadDevices = async () => {
    setLoadingDevices(true);
    try {
      const data = await api.getDevices();
      setDevices(data);
      
      // Keep selected device synced in sidepanel if open
      if (selectedDevice) {
        const updated = data.find(d => d.id === selectedDevice.id);
        if (updated) setSelectedDevice(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const handleLoginSuccess = (userSession) => {
    setCurrentUser(userSession);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('veyla_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  const handleNodeClick = (node) => {
    setSelectedDevice(node);
    setIsPanelOpen(true);
  };

  const handleMuteUpdate = (deviceId, isMuted, muteUntil) => {
    setDevices(prev => prev.map(d => 
      d.id === deviceId 
        ? { ...d, is_muted: isMuted, mute_until: muteUntil }
        : d
    ));
    if (selectedDevice && selectedDevice.id === deviceId) {
      setSelectedDevice(prev => ({ ...prev, is_muted: isMuted, mute_until: muteUntil }));
    }
  };

  const triggerScan = async () => {
    setScanning(true);
    try {
      const data = await api.triggerDiscoveryScan();
      setScanResults(data || []);
      setShowScanResultsModal(true);
    } catch (err) {
      alert("Failed to run active discovery: " + err.message);
    } finally {
      setScanning(false);
    }
  };

  const handleSaveScanResults = async (selectedDevices) => {
    setSavingScan(true);
    try {
      await api.batchSaveDevices(selectedDevices);
      setShowScanResultsModal(false);
      loadDevices();
    } catch (err) {
      alert("Failed to save scanned devices: " + err.message);
    } finally {
      setSavingScan(false);
    }
  };

  const handleAddDevice = async (e) => {
    e.preventDefault();
    setAddError('');
    try {
      await api.addDevice({
        ip_address: newIp,
        name: newName,
        category: newCategory,
        location: newLocation
      });
      setShowAddModal(false);
      setNewIp('');
      setNewName('');
      loadDevices();
    } catch (err) {
      setAddError(err.message || 'Failed to add device');
    }
  };

  // Helper stats
  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline' && !d.is_muted).length;
  const warningCount = devices.filter(d => d.status === 'warning').length;

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'super_admin';

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="brand-logo">⚡</div>
          <div>
            <h1 className="brand-title">Veyla</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Network Control Panel
            </span>
          </div>
        </div>

        <div className="header-actions">
          {/* Status Pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginRight: '1rem', fontSize: '0.8rem' }}>
            <span className="status-badge online"><Wifi size={12} /> {onlineCount} Online</span>
            {warningCount > 0 && <span className="status-badge warning">{warningCount} Warning</span>}
            {offlineCount > 0 && <span className="status-badge offline"><WifiOff size={12} /> {offlineCount} Offline</span>}
          </div>

          <button className="theme-toggle-btn" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginLeft: '0.5rem', paddingLeft: '1rem', borderLeft: '1px solid var(--border-color)' }}>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>{currentUser.username}</p>
              <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>{currentUser.role}</p>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--status-critical)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.5rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(244, 63, 94, 0.08)'
              }}
              title="Logout"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {localStorage.getItem("veyla_original_token") && (
        <div style={{
          backgroundColor: 'var(--status-online)',
          color: '#020617',
          padding: '0.5rem 1rem',
          fontSize: '0.85rem',
          fontWeight: 700,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>⚡</span>
            <span>
              SIMULATION MODE: You are currently simulating <strong>{currentUser.username}</strong> ({currentUser.role}).
            </span>
          </div>
          <button 
            onClick={() => {
              api.exitImpersonation();
              window.location.reload();
            }}
            style={{
              backgroundColor: '#020617',
              color: 'var(--status-online)',
              border: '1px solid var(--status-online)',
              padding: '0.25rem 0.75rem',
              borderRadius: '4px',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Exit Simulation
          </button>
        </div>
      )}

      {/* Main Body Layout */}
      <div className="main-wrapper">
        <aside className="sidebar-nav">
          <ul className="nav-links">
            <li 
              className={`nav-item ${currentView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setCurrentView('dashboard')}
            >
              <Network size={18} /> Topology Map
            </li>
            {isAdmin && (
              <li 
                className={`nav-item ${currentView === 'registry' ? 'active' : ''}`}
                onClick={() => setCurrentView('registry')}
              >
                <Database size={18} /> Device Registry
              </li>
            )}
            {isAdmin && (
              <li 
                className={`nav-item ${currentView === 'logs' ? 'active' : ''}`}
                onClick={() => setCurrentView('logs')}
              >
                <ShieldAlert size={18} /> Security Logs
              </li>
            )}
            {currentUser.role === 'super_admin' && (
              <li 
                className={`nav-item ${currentView === 'settings' ? 'active' : ''}`}
                onClick={() => setCurrentView('settings')}
              >
                <SettingsIcon size={18} /> System Settings
              </li>
            )}
          </ul>

          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-card)', borderRadius: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>LAN Gateway Info</p>
            <p style={{ fontFamily: 'var(--font-mono)' }}>IP: 192.168.1.1</p>
            <p style={{ fontFamily: 'var(--font-mono)' }}>Mask: 255.255.255.0</p>
          </div>
        </aside>

        <main className="content-pane">
          {currentView === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%' }}>
              
              {/* Dashboard Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Network Dashboard</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Veyla Local Subnet</p>
                </div>

                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn btn-secondary" onClick={triggerScan} disabled={scanning}>
                      <RefreshCw size={14} className={scanning ? 'animate-spin' : ''} />
                      {scanning ? 'Scanning 192.168.1.0/24...' : 'Trigger Discovery Scan'}
                    </button>
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                      <Plus size={14} /> Add Device (Manual)
                    </button>
                  </div>
                )}
              </div>

              {/* Topology Rendering */}
              <div style={{ flex: 1, minHeight: '520px' }}>
                <TopologyMap devices={devices.filter(d => d.show_on_map)} onNodeClick={handleNodeClick} />
              </div>
            </div>
          )}

          {currentView === 'registry' && <DeviceRegistry onRegistryChange={loadDevices} />}

          {currentView === 'logs' && <AuditLogs />}
          
          {currentView === 'settings' && <Settings currentUser={currentUser} />}
        </main>
      </div>

      {/* Side Slide-out Details Drawer */}
      <SidePanel 
        isOpen={isPanelOpen} 
        device={selectedDevice} 
        onClose={() => { setIsPanelOpen(false); setSelectedDevice(null); }}
        onMuteUpdate={handleMuteUpdate}
      />

      {/* Manual Add Device Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '450px', position: 'relative', border: '1px solid var(--border-color-active)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1.5rem' }}>Register IP Device</h3>
            
            {addError && (
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--status-critical)',
                color: 'var(--status-critical)',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddDevice} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>IP Address</label>
                <input
                  type="text"
                  className="input-field"
                  value={newIp}
                  onChange={(e) => setNewIp(e.target.value)}
                  placeholder="e.g. 192.168.1.15"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Device Name</label>
                <input
                  type="text"
                  className="input-field"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Stage Mix POS"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Category</label>
                  <select
                    className="input-field"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                  >
                    <option value="Router">Router</option>
                    <option value="Switch">Switch</option>
                    <option value="POS">POS Terminal</option>
                    <option value="CCTV">CCTV Camera</option>
                    <option value="Printer">HP Printer</option>
                    <option value="Monitor KDS">Monitor KDS</option>
                    <option value="PC">Admin PC</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>Location Tag</label>
                  <select
                    className="input-field"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                  >
                    <option value="Cashier">Cashier</option>
                    <option value="Bar">Bar</option>
                    <option value="Stage">Stage</option>
                    <option value="Kitchen">Kitchen</option>
                    <option value="Office">Office</option>
                    <option value="Ceiling">Ceiling</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Discovered Devices Selection Popup Modal */}
      {showScanResultsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '850px', maxHeight: '85vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-color-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1rem' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Discovered Devices on Subnet</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                  Select devices to display on the topology map. Unselected devices will still be saved to the registry.
                </p>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1.5rem', paddingRight: '0.5rem' }}>
              {scanResults.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                  No online devices detected in the subnet range.
                </div>
              ) : (
                <table className="data-table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th style={{ width: '50px', textAlign: 'center' }}>Show</th>
                      <th>IP Address</th>
                      <th>MAC Address</th>
                      <th>Custom Name</th>
                      <th>Category</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {scanResults.map((item, index) => {
                      const handleRowChange = (field, value) => {
                        setScanResults(prev => prev.map((val, idx) => 
                          idx === index ? { ...val, [field]: value } : val
                        ));
                      };

                      return (
                        <tr key={`scan-${item.ip_address}-${index}`}>
                          <td style={{ textAlign: 'center' }}>
                            <input
                              type="checkbox"
                              checked={item.show_on_map}
                              onChange={(e) => handleRowChange('show_on_map', e.target.checked)}
                              style={{ width: '18px', height: '18px', accentColor: 'var(--color-primary)', cursor: 'pointer' }}
                            />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{item.ip_address}</td>
                          <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>{item.mac_address}</td>
                          <td>
                            <input
                              type="text"
                              className="input-field"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                              value={item.name}
                              onChange={(e) => handleRowChange('name', e.target.value)}
                            />
                          </td>
                          <td>
                            <select
                              className="input-field"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                              value={item.category}
                              onChange={(e) => handleRowChange('category', e.target.value)}
                            >
                              <option value="Router">Router</option>
                              <option value="Switch">Switch</option>
                              <option value="POS">POS Terminal</option>
                              <option value="CCTV">CCTV Camera</option>
                              <option value="Printer">HP Printer</option>
                              <option value="Monitor KDS">Monitor KDS</option>
                              <option value="PC">Admin PC</option>
                            </select>
                          </td>
                          <td>
                            <select
                              className="input-field"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                              value={item.location}
                              onChange={(e) => handleRowChange('location', e.target.value)}
                            >
                              <option value="Cashier">Cashier</option>
                              <option value="Bar">Bar</option>
                              <option value="Stage">Stage</option>
                              <option value="Kitchen">Kitchen</option>
                              <option value="Office">Office</option>
                              <option value="Ceiling">Ceiling</option>
                              <option value="Unknown">Unknown</option>
                            </select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowScanResultsModal(false)}
                disabled={savingScan}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => handleSaveScanResults(scanResults)}
                disabled={savingScan || scanResults.length === 0}
              >
                {savingScan ? 'Saving to Database...' : `Save & Process (${scanResults.length} Nodes)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
