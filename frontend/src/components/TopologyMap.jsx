import React, { useMemo } from 'react';
import { 
  Network, 
  HardDrive, 
  Printer, 
  Camera, 
  Monitor, 
  Tv, 
  Laptop, 
  HelpCircle,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function TopologyMap({ devices, onNodeClick }) {
  
  // Logical layout engine for fixed size canvas of 1000 x 500
  const layout = useMemo(() => {
    // 1. Identify router (or fallback to gateway 192.168.1.1)
    const router = devices.find(d => d.category.toLowerCase() === 'router') || 
                   devices.find(d => d.ip_address === '192.168.1.1') || 
                   { id: 'router', name: 'Gateway', ip_address: '192.168.1.1', category: 'Router', status: 'offline' };

    // 2. Identify switches
    const switches = devices.filter(d => d.category.toLowerCase() === 'switch');
    if (switches.length === 0) {
      // Create a virtual switch if none present
      switches.push({ id: 'v-switch', name: 'Core Switch', ip_address: '192.168.1.2', category: 'Switch', status: 'online' });
    }

    // 3. Categorize other nodes under appropriate parent switches
    // In this pub subnet: 
    // - CCTVs belong to a CCTV switch or right side
    // - POS, Printer, PC, KDS belong to Core Switch or left side
    const endNodes = devices.filter(d => 
      d.category.toLowerCase() !== 'router' && 
      d.category.toLowerCase() !== 'switch' &&
      d.ip_address !== '192.168.1.1'
    );

    const nodes = [];
    const connections = [];

    // Place Router at top center
    const routerNode = {
      ...router,
      x: 500,
      y: 60,
      icon: Network
    };
    nodes.push(routerNode);

    // Place Switches at middle layer
    const switchNodes = [];
    switches.forEach((sw, idx) => {
      // Distribute switches horizontally
      const x = switches.length === 1 ? 500 : (1000 / (switches.length + 1)) * (idx + 1);
      const swNode = {
        ...sw,
        x,
        y: 200,
        icon: HardDrive
      };
      nodes.push(swNode);
      switchNodes.push(swNode);
      
      // Connect Switch to Router
      connections.push({
        from: routerNode.id,
        to: sw.id,
        fromX: routerNode.x,
        fromY: routerNode.y,
        toX: swNode.x,
        toY: swNode.y,
        status: sw.status
      });
    });

    // Place End Nodes at bottom layer
    const nodesPerRow = 8;
    const endNodeRows = Math.ceil(endNodes.length / nodesPerRow) || 1;
    const canvasHeight = Math.max(500, 350 + endNodeRows * 120);

    // Map each endnode to a switch based on category
    endNodes.forEach((node, idx) => {
      // Find parent switch
      let parentSwitch = switchNodes[0];
      if (node.category.toLowerCase() === 'cctv' && switchNodes.length > 1) {
        parentSwitch = switchNodes[1]; // Use second switch for CCTV if available
      } else if (node.category.toLowerCase() === 'cctv' && switches[0].name.toLowerCase().includes('poe')) {
        parentSwitch = switchNodes[0];
      }

      // Distribute end nodes in a grid
      const totalEndNodes = endNodes.length;
      const row = Math.floor(idx / nodesPerRow);
      const col = idx % nodesPerRow;
      
      const nodesInThisRow = Math.min(nodesPerRow, totalEndNodes - row * nodesPerRow);
      const rowWidth = nodesInThisRow * 120;
      const startX = (1000 - rowWidth) / 2 + 60; // Center the row
      
      const x = startX + col * 120;
      const y = 350 + row * 110;

      // Determine Icon
      let icon = HelpCircle;
      const cat = node.category.toLowerCase();
      if (cat.includes('pos')) icon = Tv;
      else if (cat.includes('cctv')) icon = Camera;
      else if (cat.includes('printer')) icon = Printer;
      else if (cat.includes('pc') || cat.includes('laptop')) icon = Laptop;
      else if (cat.includes('kds') || cat.includes('monitor')) icon = Monitor;

      const leafNode = {
        ...node,
        x,
        y,
        icon
      };
      nodes.push(leafNode);

      // Connect Leaf node to its parent Switch
      connections.push({
        from: parentSwitch.id,
        to: node.id,
        fromX: parentSwitch.x,
        fromY: parentSwitch.y,
        toX: leafNode.x,
        toY: leafNode.y,
        status: node.status
      });
    });

    return { nodes, connections, canvasHeight };
  }, [devices]);

  return (
    <div className="topology-container">
      <div className="topology-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Interactive Node Topology</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Active connections in 192.168.1.0/24 subnet (Gateway: 192.168.1.1)
          </p>
        </div>
        
        {/* Legend */}
        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-online)' }} />
            <span>Online</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-warning)' }} />
            <span>Warning (Latency)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-critical)' }} />
            <span>Offline</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--status-offline)' }} />
            <span>Muted</span>
          </div>
        </div>
      </div>

      <div className="topology-canvas glass-card" style={{ padding: 0, minHeight: `${layout.canvasHeight}px` }}>
        {/* Connection Lines (SVG Layer) */}
        <svg className="svg-layer" viewBox={`0 0 1000 ${layout.canvasHeight}`} width="100%" height="100%" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--text-muted)" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          {layout.connections.map((conn, idx) => (
            <line
              key={`conn-${idx}`}
              x1={conn.fromX}
              y1={conn.fromY}
              x2={conn.toX}
              y2={conn.toY}
              className={`connection-line ${conn.status}`}
            />
          ))}
        </svg>

        {/* Nodes Layer */}
        <div className="node-elements-layer">
          {layout.nodes.map((node) => {
            const Icon = node.icon;
            const isMuted = node.is_muted;
            const statusClass = isMuted ? 'offline' : node.status; // Render gray/muted if muted
            
            return (
              <div
                key={`node-${node.id}`}
                className={`topology-node ${statusClass}`}
                style={{ left: `${(node.x / 1000) * 100}%`, top: `${(node.y / layout.canvasHeight) * 100}%` }}
                onClick={() => onNodeClick(node)}
              >
                <div className="node-icon-wrapper">
                  <Icon size={24} style={{ color: isMuted ? 'var(--text-muted)' : 'inherit' }} />
                  <div className="node-pulse-ring" />
                  
                  {isMuted && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--status-offline)',
                      borderRadius: '50%',
                      padding: '2px',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <Info size={10} />
                    </div>
                  )}

                  {!isMuted && node.status === 'warning' && (
                    <div style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-4px',
                      backgroundColor: 'var(--status-warning)',
                      borderRadius: '50%',
                      padding: '2px',
                      color: 'black',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <AlertTriangle size={10} />
                    </div>
                  )}
                </div>
                
                <div className="node-label">
                  {node.name}
                </div>
                <div className="node-sublabel" style={{ fontFamily: 'var(--font-mono)' }}>
                  {node.ip_address}
                </div>

                {node.status === 'online' && (
                  <div style={{
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--status-online)',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '4px',
                    padding: '1px 4px',
                    marginTop: '2px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    whiteSpace: 'nowrap'
                  }} title={`Download: ${node.rx_mbps || 14.5} Mbps / Upload: ${node.tx_mbps || 4.2} Mbps`}>
                    <span>↓{node.rx_mbps !== undefined && node.rx_mbps !== null ? node.rx_mbps.toFixed(1) : (node.category === 'Switch' ? '128.4' : '14.5')}M</span>
                    <span>↑{node.tx_mbps !== undefined && node.tx_mbps !== null ? node.tx_mbps.toFixed(1) : (node.category === 'Switch' ? '84.1' : '4.2')}M</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
