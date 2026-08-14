import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Trash2, Eye, EyeOff, Search, RefreshCw, Terminal, Copy, Check } from 'lucide-react';

export default function DeviceRegistry({ onRegistryChange }) {
  const [devices, setDevices] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDevices();
      setDevices(data);
    } catch (err) {
      setError('Failed to fetch devices list.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibility = async (device) => {
    const updatedStatus = !device.show_on_map;
    try {
      await api.updateDevice(device.id, { show_on_map: updatedStatus });
      setDevices(prev => prev.map(d => d.id === device.id ? { ...d, show_on_map: updatedStatus } : d));
      if (onRegistryChange) onRegistryChange();
    } catch (err) {
      alert('Failed to update device visibility.');
    }
  };

  const handleDeleteDevice = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}"?`)) return;
    try {
      await api.deleteDevice(id);
      setDevices(prev => prev.filter(d => d.id !== id));
      if (onRegistryChange) onRegistryChange();
    } catch (err) {
      alert('Failed to delete device.');
    }
  };

  const [copiedId, setCopiedId] = useState(null);
  const copyTimeoutRef = React.useRef(null);

  const handleCopyBeaconCommand = async (device) => {
    const cmd = api.getBeaconCommand(device.ip_address);
    try {
      await navigator.clipboard.writeText(cmd);
      // Bug fix: Clear any previous timeout to avoid stale "Copied!" state on rapid clicks
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
      setCopiedId(device.id);
      copyTimeoutRef.current = setTimeout(() => setCopiedId(null), 2500);
    } catch (err) {
      // Clipboard write failed (non-HTTPS or permission denied) — fallback alert
      alert('Copy failed. Please copy manually:\n\n' + cmd);
    }
  };

  const filteredDevices = devices.filter(d => 
    (d.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.ip_address || '').includes(search) ||
    (d.mac_address && d.mac_address.toLowerCase().includes(search.toLowerCase())) ||
    (d.category || '').toLowerCase().includes(search.toLowerCase()) ||
    (d.location && d.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Device Registry & Beacon Ping</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Manage all monitored nodes and copy 1-liner beacon ping commands for remote clients
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="input-field"
              placeholder="Search IP, name, category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2rem', fontSize: '0.85rem' }}
            />
          </div>

          <button className="btn btn-secondary" onClick={fetchDevices} disabled={loading} title="Refresh Registry">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.75rem', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--status-critical)', color: 'var(--status-critical)', borderRadius: '8px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading && devices.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
            Loading registered devices...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Beacon Ping (Option 1)</th>
                  <th style={{ textAlign: 'center' }}>Show on Map</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                      No devices found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  filteredDevices.map(device => (
                    <tr key={`reg-${device.id}`}>
                      <td style={{ fontWeight: 600 }}>{device.name}</td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{device.ip_address}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {device.mac_address || 'unknown'}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', backgroundColor: 'var(--border-color)', borderRadius: '6px' }}>
                          {device.category}
                        </span>
                      </td>
                      <td>{device.location || 'Unknown'}</td>
                      <td>
                        <span className={`status-badge ${device.status}`}>
                          {device.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleCopyBeaconCommand(device)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.35rem 0.6rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            border: '1px solid var(--border-color-active)',
                            backgroundColor: copiedId === device.id ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                            color: copiedId === device.id ? 'var(--status-online)' : 'var(--text-primary)',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          title="Copy 1-liner curl command for client machine"
                        >
                          {copiedId === device.id ? (
                            <>
                              <Check size={12} /> Copied!
                            </>
                          ) : (
                            <>
                              <Terminal size={12} /> Copy Command
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          onClick={() => handleToggleVisibility(device)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: device.show_on_map ? 'var(--status-online)' : 'var(--text-muted)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.4rem 0.8rem',
                            borderRadius: '8px',
                            backgroundColor: device.show_on_map ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.02)',
                            transition: 'all 0.2s'
                          }}
                          title={device.show_on_map ? "Click to hide from map" : "Click to show on map"}
                        >
                          {device.show_on_map ? (
                            <>
                              <Eye size={16} /> <span>Shown</span>
                            </>
                          ) : (
                            <>
                              <EyeOff size={16} /> <span style={{ color: 'var(--text-muted)' }}>Hidden</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className="btn btn-danger"
                          style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', display: 'inline-flex' }}
                          onClick={() => handleDeleteDevice(device.id, device.name)}
                          title="Delete Device"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
