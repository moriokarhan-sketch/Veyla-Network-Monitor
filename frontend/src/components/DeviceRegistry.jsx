import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Trash2, Eye, EyeOff, Search, RefreshCw } from 'lucide-react';

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

  const filteredDevices = devices.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.ip_address.includes(search) ||
    (d.mac_address && d.mac_address.toLowerCase().includes(search.toLowerCase())) ||
    d.category.toLowerCase().includes(search.toLowerCase()) ||
    (d.location && d.location.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Device Registry</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Comprehensive list of all registered IP endpoints in Veyla network.
          </p>
        </div>
        <button className="btn btn-secondary" onClick={fetchDevices} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      <div className="glass-card" style={{ padding: '1.5rem' }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            type="text"
            className="input-field"
            style={{ paddingLeft: '2.5rem' }}
            placeholder="Search by name, IP, MAC address, category or location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <div style={{ padding: '1rem', color: 'var(--status-critical)', backgroundColor: 'rgba(244, 63, 94, 0.1)', borderRadius: '8px', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Loading database registry...
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Device Name</th>
                  <th>IP Address</th>
                  <th>MAC Address</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'center' }}>Show on Map</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
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
