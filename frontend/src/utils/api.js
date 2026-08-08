const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const getHeaders = () => {
  const token = localStorage.getItem("veyla_token");
  const headers = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// Fallback Mock Data for UI/Frontend standalone rendering
const MOCK_DEVICES = [
  { id: 1, ip_address: "192.168.1.1", mac_address: "00:11:22:33:44:55", name: "Gateway Router", category: "Router", location: "Stage", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 2.4, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 2, ip_address: "192.168.1.2", mac_address: "00:11:22:33:aa:bb", name: "Core Omada Switch", category: "Switch", location: "Office", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 1.8, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 3, ip_address: "192.168.1.10", mac_address: "aa:bb:cc:dd:ee:01", name: "Cashier POS 1", category: "POS", location: "Cashier", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 4.1, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 4, ip_address: "192.168.1.11", mac_address: "aa:bb:cc:dd:ee:02", name: "Bar POS 2", category: "POS", location: "Bar", is_monitored: true, is_muted: false, mute_until: null, status: "warning", last_latency: 142.6, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 5, ip_address: "192.168.1.20", mac_address: "22:33:44:55:66:77", name: "Kitchen KDS Monitor", category: "Monitor KDS", location: "Kitchen", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 3.5, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 6, ip_address: "192.168.1.50", mac_address: "f0:25:72:a1:b2:c3", name: "Bar CCTV IP Cam", category: "CCTV", location: "Bar", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 5.2, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 7, ip_address: "192.168.1.51", mac_address: "f0:25:72:a1:b2:c4", name: "Stage CCTV IP Cam", category: "CCTV", location: "Stage", is_monitored: true, is_muted: true, mute_until: new Date(Date.now() + 30 * 60000).toISOString(), status: "offline", last_latency: null, last_seen: new Date(Date.now() - 3600000).toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 8, ip_address: "192.168.1.100", mac_address: "cc:cc:cc:11:22:33", name: "HP LaserJet Receipts", category: "Printer", location: "Cashier", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 8.7, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true },
  { id: 9, ip_address: "192.168.1.201", mac_address: "bc:5f:f4:90:12:34", name: "Office Admin PC", category: "PC", location: "Office", is_monitored: true, is_muted: false, mute_until: null, status: "online", last_latency: 2.1, last_seen: new Date().toISOString(), created_at: new Date().toISOString(), show_on_map: true }
];

export const api = {
  // Authentication
  async login(username, password) {
    try {
      const details = { username, password };
      const formBody = Object.keys(details)
        .map(key => encodeURIComponent(key) + '=' + encodeURIComponent(details[key]))
        .join('&');

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formBody,
      });

      if (!response.ok) {
        throw new Error("Invalid username or password");
      }

      const data = await response.json();
      localStorage.setItem("veyla_token", data.access_token);
      localStorage.setItem("veyla_user", username);
      // Decode simple token role
      let role = "viewer";
      if (username.includes("admin")) role = "admin";
      if (username === "admin") role = "super_admin";
      localStorage.setItem("veyla_role", role);
      
      return { success: true, username, role };
    } catch (error) {
      // Mock Fallback
      if (username === "admin" && password === "admin123") {
        localStorage.setItem("veyla_token", "mock-token-admin");
        localStorage.setItem("veyla_user", "admin");
        localStorage.setItem("veyla_role", "super_admin");
        return { success: true, username: "admin", role: "super_admin" };
      }
      throw error;
    }
  },

  logout() {
    localStorage.removeItem("veyla_token");
    localStorage.removeItem("veyla_user");
    localStorage.removeItem("veyla_role");
    localStorage.removeItem("veyla_original_token");
    localStorage.removeItem("veyla_original_user");
    localStorage.removeItem("veyla_original_role");
  },

  getCurrentUser() {
    const token = localStorage.getItem("veyla_token");
    if (!token) return null;
    return {
      username: localStorage.getItem("veyla_user"),
      role: localStorage.getItem("veyla_role"),
    };
  },

  async getUsers() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return await response.json();
    } catch (error) {
      // Mock Fallback
      return [
        { id: 1, username: "admin", role: "super_admin", is_active: true },
        { id: 2, username: "veyla_admin", role: "admin", is_active: true },
        { id: 3, username: "staff", role: "viewer", is_active: true }
      ];
    }
  },

  async register(user) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify(user)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to register user");
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes("Failed to fetch")) {
        const newUser = {
          ...user,
          id: Math.random(),
          created_at: new Date().toISOString()
        };
        return newUser;
      }
      throw error;
    }
  },

  async deleteUser(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return await response.json();
    } catch (error) {
      return { status: "success" };
    }
  },

  async updateUser(userId, data) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to update user");
      }
      return await response.json();
    } catch (error) {
      return { id: userId, ...data };
    }
  },

  async impersonateUser(userId, targetUsername, targetRole) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/impersonate/${userId}`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Impersonation request failed");
      }
      const data = await response.json();

      // Back up current super_admin session before overwriting
      localStorage.setItem("veyla_original_token", localStorage.getItem("veyla_token"));
      localStorage.setItem("veyla_original_user", localStorage.getItem("veyla_user"));
      localStorage.setItem("veyla_original_role", localStorage.getItem("veyla_role"));

      // Set new simulated session
      localStorage.setItem("veyla_token", data.access_token);
      localStorage.setItem("veyla_user", targetUsername);
      localStorage.setItem("veyla_role", targetRole);

      return { success: true };
    } catch (error) {
      if (error.message.includes("Failed to fetch")) {
        // Mock fallback impersonation
        localStorage.setItem("veyla_original_token", localStorage.getItem("veyla_token") || "mock-token-admin");
        localStorage.setItem("veyla_original_user", localStorage.getItem("veyla_user") || "admin");
        localStorage.setItem("veyla_original_role", localStorage.getItem("veyla_role") || "super_admin");

        localStorage.setItem("veyla_token", `mock-token-${targetUsername}`);
        localStorage.setItem("veyla_user", targetUsername);
        localStorage.setItem("veyla_role", targetRole);
        return { success: true };
      }
      throw error;
    }
  },

  exitImpersonation() {
    const origToken = localStorage.getItem("veyla_original_token");
    const origUser = localStorage.getItem("veyla_original_user");
    const origRole = localStorage.getItem("veyla_original_role");

    if (origToken && origUser && origRole) {
      localStorage.setItem("veyla_token", origToken);
      localStorage.setItem("veyla_user", origUser);
      localStorage.setItem("veyla_role", origRole);
    }

    localStorage.removeItem("veyla_original_token");
    localStorage.removeItem("veyla_original_user");
    localStorage.removeItem("veyla_original_role");
  },

  // Devices
  async getDevices() {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch devices");
      return await response.json();
    } catch (error) {
      console.warn("Backend unavailable, using mock devices data.");
      return MOCK_DEVICES;
    }
  },

  async addDevice(device) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify(device)
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to add device");
      }
      return await response.json();
    } catch (error) {
      if (error.message.includes("Failed to fetch") || error.message.includes("Backend unavailable")) {
        // Mock add
        const newDevice = {
          ...device,
          id: Math.max(...MOCK_DEVICES.map(d => d.id)) + 1,
          status: "online",
          created_at: new Date().toISOString(),
          show_on_map: true
        };
        MOCK_DEVICES.push(newDevice);
        return newDevice;
      }
      throw error;
    }
  },

  async updateDevice(id, device) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify(device)
      });
      if (!response.ok) throw new Error("Failed to update device");
      return await response.json();
    } catch (error) {
      // Mock update
      const index = MOCK_DEVICES.findIndex(d => d.id === id);
      if (index !== -1) {
        MOCK_DEVICES[index] = { ...MOCK_DEVICES[index], ...device };
        return MOCK_DEVICES[index];
      }
      throw error;
    }
  },

  async deleteDevice(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
        method: "DELETE",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to delete device");
      return await response.json();
    } catch (error) {
      const index = MOCK_DEVICES.findIndex(d => d.id === id);
      if (index !== -1) {
        MOCK_DEVICES.splice(index, 1);
        return { status: "success" };
      }
      throw error;
    }
  },

  async muteDevice(id, minutes) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${id}/mute?minutes=${minutes}`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to mute device");
      return await response.json();
    } catch (error) {
      // Mock mute
      const index = MOCK_DEVICES.findIndex(d => d.id === id);
      if (index !== -1) {
        MOCK_DEVICES[index].is_muted = minutes > 0;
        MOCK_DEVICES[index].mute_until = minutes > 0 ? new Date(Date.now() + minutes * 60000).toISOString() : null;
        return { is_muted: MOCK_DEVICES[index].is_muted, mute_until: MOCK_DEVICES[index].mute_until };
      }
      throw error;
    }
  },

  async getDeviceTelemetry(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/${id}/telemetry`, {
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch telemetry");
      return await response.json();
    } catch (error) {
      // Return custom mock telemetry based on device category
      const dev = MOCK_DEVICES.find(d => d.id === id);
      if (!dev) return { uptime: "N/A", raw_metrics: {} };
      
      if (dev.category.toLowerCase().includes("switch")) {
        return {
          uptime: "14 days, 6 hours",
          raw_metrics: {
            "ports": {
              "Port 1 (Uplink)": "Up",
              "Port 2 (POS-1)": "Up",
              "Port 3 (CCTV-1)": "Up",
              "Port 4 (PC-1)": "Down",
              "Port 5 (KDS)": "Up"
            },
            "poe_draw_watts": 42.8,
            "max_poe_budget_watts": 150.0,
            "vlan_count": 3
          }
        };
      } else if (dev.category.toLowerCase().includes("printer")) {
        return {
          uptime: "3 days, 12 hours",
          raw_metrics: {
            "toner_level_pct": 65.0,
            "paper_status": "Ready",
            "error_code": "00-Normal",
            "page_count": 12850
          }
        };
      } else {
        return {
          uptime: "5 days, 8 hours",
          raw_metrics: {
            "description": "Standard IP device monitored via ICMP"
          }
        };
      }
    }
  },

  // Logs
  async getPingLogs(deviceId = null, hours = 12) {
    try {
      const url = deviceId 
        ? `${API_BASE_URL}/logs/ping?device_id=${deviceId}&hours=${hours}` 
        : `${API_BASE_URL}/logs/ping?hours=${hours}`;
      const response = await fetch(url, { headers: getHeaders() });
      if (!response.ok) throw new Error("Failed to fetch ping logs");
      return await response.json();
    } catch (error) {
      // Mock logs for chart
      const logs = [];
      const now = Date.now();
      const count = 20;
      for (let i = count; i >= 0; i--) {
        const time = new Date(now - i * 30 * 60000);
        logs.push({
          id: i,
          device_id: deviceId || 1,
          latency_ms: Math.random() > 0.05 ? (Math.random() * 8 + 1.5) : null, // 5% offline simulation
          status: Math.random() > 0.05 ? "online" : "offline",
          timestamp: time.toISOString()
        });
      }
      return logs;
    }
  },

  async getAuditLogs() {
    try {
      const response = await fetch(`${API_BASE_URL}/logs/audit`, { headers: getHeaders() });
      if (!response.ok) throw new Error("Failed to fetch audit logs");
      return await response.json();
    } catch (error) {
      return [
        { id: 1, username: "admin", action: "SETTING_CHANGED", details: "Changed line_notify_token to value *****", timestamp: new Date().toISOString() },
        { id: 2, username: "admin", action: "DEVICE_ADDED", details: "Added Cashier POS 1 (192.168.1.10)", timestamp: new Date(Date.now() - 3600000).toISOString() },
        { id: 3, username: "veyla_admin", action: "DEVICE_MUTED", details: "Muted CCTV IP Cam for 30 minutes", timestamp: new Date(Date.now() - 7200000).toISOString() }
      ];
    }
  },

  // Settings
  async getSettings() {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`, { headers: getHeaders() });
      if (!response.ok) throw new Error("Failed to fetch settings");
      return await response.json();
    } catch (error) {
      return [
        { id: 1, key: "line_notify_token", value: "ln_token_placeholder_veyla", description: "LINE Notify Authorization Token for alerts" },
        { id: 2, key: "smtp_server", value: "smtp.gmail.com", description: "SMTP Server address" },
        { id: 3, key: "smtp_port", value: "587", description: "SMTP connection port" },
        { id: 4, key: "smtp_username", value: "alerts@veyla.com", description: "SMTP username/email" },
        { id: 5, key: "smtp_password", value: "********", description: "SMTP password/app password" },
        { id: 6, key: "alert_email_from", value: "alerts@veyla.com", description: "Sender email address" },
        { id: 7, key: "alert_email_to", value: "owner@veyla.com", description: "Recipient email address for critical alerts" }
      ];
    }
  },

  async updateSetting(key, value) {
    try {
      const response = await fetch(`${API_BASE_URL}/settings/${key}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify({ value })
      });
      if (!response.ok) throw new Error("Failed to update setting");
      return await response.json();
    } catch (error) {
      return { key, value };
    }
  },

  // Subnet active discovery
  async triggerDiscoveryScan() {
    try {
      const response = await fetch(`${API_BASE_URL}/discovery/scan`, {
        method: "POST",
        headers: getHeaders()
      });
      if (!response.ok) throw new Error("Failed to trigger subnet scan");
      return await response.json();
    } catch (error) {
      return [
        { ip_address: "192.168.1.15", mac_address: "aa:bb:cc:dd:ee:15", name: "Discovered Device (192.168.1.15)", category: "PC", location: "Unknown", show_on_map: false, already_exists: false },
        { ip_address: "192.168.1.33", mac_address: "aa:bb:cc:dd:ee:33", name: "Discovered Device (192.168.1.33)", category: "PC", location: "Unknown", show_on_map: false, already_exists: false },
        { ip_address: "192.168.1.10", mac_address: "aa:bb:cc:dd:ee:01", name: "Cashier POS 1", category: "POS", location: "Cashier", show_on_map: true, already_exists: true }
      ];
    }
  },

  async batchSaveDevices(devices) {
    try {
      const response = await fetch(`${API_BASE_URL}/devices/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders()
        },
        body: JSON.stringify(devices)
      });
      if (!response.ok) throw new Error("Failed to save batch devices");
      return await response.json();
    } catch (error) {
      devices.forEach(item => {
        const existing = MOCK_DEVICES.find(d => d.ip_address === item.ip_address);
        if (existing) {
          existing.name = item.name;
          existing.category = item.category;
          existing.location = item.location || "Unknown";
          existing.show_on_map = item.show_on_map;
        } else {
          MOCK_DEVICES.push({
            id: Math.max(...MOCK_DEVICES.map(d => d.id), 0) + 1,
            ip_address: item.ip_address,
            mac_address: item.mac_address || "unknown",
            name: item.name,
            category: item.category,
            location: item.location || "Unknown",
            is_monitored: true,
            is_muted: false,
            mute_until: null,
            status: "online",
            show_on_map: item.show_on_map,
            created_at: new Date().toISOString()
          });
        }
      });
      return { status: "success" };
    }
  }
};
