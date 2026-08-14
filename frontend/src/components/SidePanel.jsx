import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { X, VolumeX, Volume2, ShieldAlert, Cpu, Activity, Clock, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function SidePanel({ isOpen, device, onClose, onMuteUpdate }) {
  const [telemetry, setTelemetry] = useState(null);
  const [pingLogs, setPingLogs] = useState([]);
  const [loadingTelemetry, setLoadingTelemetry] = useState(false);
  const [muteDuration, setMuteDuration] = useState('30');
  const [muteLoading, setMuteLoading] = useState(false);

  useEffect(() => {
    if (device && isOpen) {
      loadTelemetryAndLogs();
    }
  }, [device, isOpen]);

  const loadTelemetryAndLogs = async () => {
    setLoadingTelemetry(true);
    try {
      // Bug fix: Use Promise.allSettled so one failure doesn't block the other
      const [telResult, logResult] = await Promise.allSettled([
        api.getDeviceTelemetry(device.id),
        api.getPingLogs(device.id, 12) // Get last 12 hours of ping logs
      ]);
      if (telResult.status === 'fulfilled') setTelemetry(telResult.value);
      if (logResult.status === 'fulfilled') setPingLogs(logResult.value);
    } catch (err) {
      console.error("Error loading panel data:", err);
    } finally {
      setLoadingTelemetry(false);
    }
  };

  if (!device) return null;

  const handleMuteToggle = async (durationMins) => {
    setMuteLoading(true);
    try {
      const mins = parseInt(durationMins);
      const res = await api.muteDevice(device.id, mins);
      onMuteUpdate(device.id, res.is_muted, res.mute_until);
    } catch (err) {
      alert("Failed to update mute state: " + err.message);
    } finally {
      setMuteLoading(false);
    }
  };

  // Status Badge Helper
  const getStatusBadge = (dev) => {
    if (dev.is_muted) return <span className="status-badge offline">MUTED</span>;
    return <span className={`status-badge ${dev.status}`}>{dev.status}</span>;
  };

  const getTrafficValues = (dev) => {
    if (!dev || dev.status === 'offline') return { rx: '0.0', tx: '0.0' };
    // Bug fix: Use nullish coalescing so true 0 Mbps is shown, not masked by fallback
    const rawRx = dev.rx_mbps;
    const rawTx = dev.tx_mbps;
    const rxNum = (typeof rawRx === 'number' && !isNaN(rawRx)) ? rawRx : 0;
    const txNum = (typeof rawTx === 'number' && !isNaN(rawTx)) ? rawTx : 0;
    return { rx: rxNum.toFixed(1), tx: txNum.toFixed(1) };
  };

  const traffic = getTrafficValues(device);

  return (
    <>
      {/* Dark overlay backdrop */}
      <div className={`side-panel-overlay ${isOpen ? 'open' : ''}`} onClick={onClose} />

      <div className={`side-panel ${isOpen ? 'open' : ''}`}>
        <div className="side-panel-header">
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{device.name}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
              {device.ip_address}
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.25rem',
              borderRadius: '50%',
              backgroundColor: 'var(--border-color)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div className="side-panel-content">
          {/* Status & Identification Card */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Status</span>
              {getStatusBadge(device)}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '0.5rem', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Category:</span>
              <span style={{ fontWeight: 500 }}>{device.category}</span>

              <span style={{ color: 'var(--text-secondary)' }}>Location:</span>
              <span style={{ fontWeight: 500 }}>{device.location || 'N/A'}</span>

              <span style={{ color: 'var(--text-secondary)' }}>MAC:</span>
              <span style={{ fontWeight: 500, fontFamily: 'var(--font-mono)' }}>{device.mac_address || 'Unknown'}</span>
              
              <span style={{ color: 'var(--text-secondary)' }}>Traffic:</span>
              <span style={{ fontWeight: 600, color: 'var(--status-online)', fontFamily: 'var(--font-mono)' }}>
                ↓{traffic.rx} Mbps / ↑{traffic.tx} Mbps
              </span>

              <span style={{ color: 'var(--text-secondary)' }}>Last Seen:</span>
              <span style={{ fontWeight: 500 }}>
                {device.last_seen ? new Date(device.last_seen).toLocaleString() : 'Never'}
              </span>
            </div>
          </div>

          {/* Real-time Network Traffic Gauge */}
          <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderLeft: '4px solid #3b82f6' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={16} style={{ color: '#3b82f6' }} />
              Live Network Bandwidth Traffic
            </h4>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(16, 185, 129, 0.08)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--status-online)', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <ArrowDownCircle size={14} /> Download (RX)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {traffic.rx} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mbps</span>
                </div>
              </div>

              <div style={{ padding: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.08)', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#818cf8', fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  <ArrowUpCircle size={14} /> Upload (TX)
                </div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                  {traffic.tx} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Mbps</span>
                </div>
              </div>
            </div>
          </div>

          {/* Maintenance Mode Controls */}
          <div className="glass-card" style={{ borderLeft: '4px solid var(--color-primary)' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {device.is_muted ? <Volume2 size={16} /> : <VolumeX size={16} />}
              Maintenance Mode (Mute Alerts)
            </h4>
            
            {device.is_muted ? (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Alerts are currently <strong>MUTED</strong> for this device until:{' '}
                  <span style={{ fontFamily: 'var(--font-mono)' }}>
                    {device.mute_until ? new Date(device.mute_until).toLocaleTimeString() : 'N/A'}
                  </span>
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleMuteToggle(0)}
                  disabled={muteLoading}
                  style={{ width: '100%' }}
                >
                  Unmute Alerts Now
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Temporarily suppress notifications to prevent spam during planned maintenance windows.
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select
                    className="input-field"
                    value={muteDuration}
                    onChange={(e) => setMuteDuration(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="30">30 Minutes</option>
                    <option value="60">60 Minutes</option>
                    <option value="120">2 Hours</option>
                    <option value="1440">24 Hours</option>
                  </select>
                  <button
                    className="btn btn-primary"
                    onClick={() => handleMuteToggle(muteDuration)}
                    disabled={muteLoading}
                  >
                    Mute
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Latency History Graph */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Activity size={16} />
              Latency History (Last 12 Hours)
            </h4>
            
            {pingLogs.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                No latency logs available.
              </p>
            ) : (
              <div className="chart-container">
                <div className="chart-bars">
                  {pingLogs.map((log, index) => {
                    const isOffline = log.status === 'offline';
                    const rawVal = log.latency_ms;
                    const val = (typeof rawVal === 'number' && !isNaN(rawVal)) ? rawVal : null;
                    const heightPercent = isOffline || val === null
                      ? 100 
                      : Math.min(100, Math.max(10, (val / 150) * 100));
                      
                    return (
                      <div key={index} className="chart-bar-wrapper">
                        <div 
                          className={`chart-bar ${isOffline || val === null ? 'offline' : ''}`}
                          style={{ height: `${heightPercent}%` }}
                        />
                        <div className="chart-tooltip">
                          {isOffline || val === null 
                            ? 'Offline' 
                            : `${val.toFixed(1)}ms`}
                          <br />
                          {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  <span>{pingLogs[0]?.timestamp ? new Date(pingLogs[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '12:00 AM'}</span>
                  <span>Latency Limit: 150ms</span>
                  <span>Now</span>
                </div>
              </div>
            )}
          </div>

          {/* SNMP Deep Metrics */}
          <div className="glass-card">
            <h4 style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Cpu size={16} />
              SNMP Telemetry Metrics
            </h4>
            
            {loadingTelemetry ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem 0' }}>
                Polling SNMP parameters...
              </p>
            ) : telemetry ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  <Clock size={14} style={{ color: 'var(--text-secondary)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>Uptime:</span>
                  <span style={{ fontWeight: 600 }}>{telemetry.uptime}</span>
                </div>

                {/* Switch Telemetry details */}
                {telemetry.raw_metrics?.ports && (
                  <div>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Interface Ports Status
                    </h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                      {Object.entries(telemetry.raw_metrics.ports).map(([port, status]) => (
                        <div key={port} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span>{port}</span>
                          <span style={{ fontWeight: 600, color: status === 'Up' ? 'var(--status-online)' : 'var(--status-critical)' }}>
                            {status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* PoE Metrics */}
                {telemetry.raw_metrics?.poe_draw_watts !== undefined && (
                  <div className="telemetry-grid">
                    <div className="metric-card">
                      <span className="metric-label">PoE Output</span>
                      <span className="metric-value">{telemetry.raw_metrics.poe_draw_watts} W</span>
                    </div>
                    <div className="metric-card">
                      <span className="metric-label">PoE Budget</span>
                      <span className="metric-value">{telemetry.raw_metrics.max_poe_budget_watts} W</span>
                    </div>
                  </div>
                )}

                {/* Printer ink details */}
                {telemetry.raw_metrics?.toner_level_pct !== undefined && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>Black Toner Level</span>
                        <span style={{ fontWeight: 700 }}>{telemetry.raw_metrics.toner_level_pct}%</span>
                      </div>
                      <div style={{ height: '8px', backgroundColor: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div 
                          style={{ 
                            height: '100%', 
                            backgroundColor: telemetry.raw_metrics.toner_level_pct < 20 ? 'var(--status-critical)' : 'var(--color-primary)', 
                            width: `${telemetry.raw_metrics.toner_level_pct}%`,
                            borderRadius: '4px',
                            transition: 'width 1s ease'
                          }} 
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <div>Paper Status: <strong>{telemetry.raw_metrics.paper_status}</strong></div>
                      <div>Total Prints: <strong>{telemetry.raw_metrics.page_count}</strong></div>
                    </div>
                  </div>
                )}

                {/* Simple Node telemetry description */}
                {(!telemetry.raw_metrics?.ports && telemetry.raw_metrics?.description) && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {telemetry.raw_metrics.description}
                  </p>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.8rem', color: 'var(--status-critical)', textAlign: 'center' }}>
                Failed to poll SNMP attributes.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
