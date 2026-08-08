import React, { useState, useEffect } from 'react';
import { api } from '../utils/api';
import { Shield, Bell, UserPlus, Trash, Save, Lock, Edit, X, Eye } from 'lucide-react';

export default function Settings({ currentUser }) {
  const [activeTab, setActiveTab] = useState('alerts');
  
  // Settings state
  const [settings, setSettings] = useState([]);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsStatus, setSettingsStatus] = useState('');

  // Users state
  const [users, setUsers] = useState([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [creatingUser, setCreatingUser] = useState(false);
  const [userError, setUserError] = useState('');

  // Editing User state
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('viewer');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  const isSuperAdmin = currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isSuperAdmin) {
      loadSettings();
      loadUsers();
    }
  }, [isSuperAdmin]);

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (err) {
      console.error("Failed to load settings:", err);
    }
  };

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleSettingChange = (key, val) => {
    setSettings(prev => prev.map(s => s.key === key ? { ...s, value: val } : s));
  };

  const saveAllSettings = async () => {
    setSavingSettings(true);
    setSettingsStatus('');
    try {
      await Promise.all(settings.map(s => api.updateSetting(s.key, s.value)));
      setSettingsStatus('Settings saved successfully!');
      setTimeout(() => setSettingsStatus(''), 3000);
    } catch (err) {
      setSettingsStatus('Error saving settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setUserError('');
    setCreatingUser(true);
    try {
      await api.register({
        username: newUsername,
        password: newPassword,
        role: newRole,
        is_active: true
      });
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      loadUsers();
    } catch (err) {
      setUserError(err.message || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(userId);
      loadUsers();
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditUser = (user) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditRole(user.role);
    setEditIsActive(user.is_active);
    setEditError('');
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setEditError('');
    setSavingUser(true);
    try {
      const updateData = {
        username: editUsername,
        role: editRole,
        is_active: editIsActive
      };
      if (editPassword) {
        updateData.password = editPassword;
      }
      await api.updateUser(editingUser.id, updateData);
      setEditingUser(null);
      loadUsers();
    } catch (err) {
      setEditError(err.message || 'Failed to update user');
    } finally {
      setSavingUser(false);
    }
  };

  const handleSimulateUser = async (user) => {
    try {
      await api.impersonateUser(user.id, user.username, user.role);
      window.location.reload();
    } catch (err) {
      alert("Failed to simulate user: " + err.message);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid rgba(244, 63, 94, 0.2)' }}>
        <Lock size={48} style={{ color: 'var(--status-critical)', marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
          Only Super Administrator roles are permitted to modify system configurations and manage user accounts.
        </p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>System Control Settings</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
          Configure integrations, alerts, and roles
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
        <button
          className={`btn ${activeTab === 'alerts' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={16} /> Alert Integrations
        </button>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Shield size={16} /> User Management (RBAC)
        </button>
      </div>

      {/* Alert settings tab */}
      {activeTab === 'alerts' && (
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Configure Alerts</h3>
          
          {settingsStatus && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '8px',
              backgroundColor: settingsStatus.includes('Error') ? 'rgba(244, 63, 94, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              border: `1px solid ${settingsStatus.includes('Error') ? 'var(--status-critical)' : 'var(--status-online)'}`,
              color: settingsStatus.includes('Error') ? 'var(--status-critical)' : 'var(--status-online)',
              fontSize: '0.85rem'
            }}>
              {settingsStatus}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {settings.map(s => (
              <div key={s.key} className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.key.replace(/_/g, ' ').toUpperCase()}</label>
                <input
                  type={s.key.includes('password') ? 'password' : 'text'}
                  className="input-field"
                  value={s.value}
                  onChange={(e) => handleSettingChange(s.key, e.target.value)}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.description}</span>
              </div>
            ))}
          </div>

          <button className="btn btn-primary" onClick={saveAllSettings} disabled={savingSettings} style={{ alignSelf: 'flex-start' }}>
            <Save size={16} />
            {savingSettings ? 'Saving Changes...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* User management tab */}
      {activeTab === 'users' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem', alignItems: 'start' }}>
          {/* User list */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Active Accounts</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td style={{ fontWeight: 600 }}>{user.username}</td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: user.role === 'super_admin' ? 'rgba(99, 102, 241, 0.15)' : 'var(--border-color)',
                        color: user.role === 'super_admin' ? 'var(--color-primary)' : 'inherit',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '6px'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: user.is_active ? 'var(--status-online)' : 'var(--status-offline)', display: 'inline-block', marginRight: '0.25rem' }} />
                      <span style={{ fontSize: '0.8rem' }}>{user.is_active ? 'Active' : 'Disabled'}</span>
                    </td>
                    <td>
                      {user.username !== currentUser.username && user.is_active && (
                        <button
                          className="btn"
                          onClick={() => handleSimulateUser(user)}
                          style={{
                            padding: '0.3rem 0.6rem',
                            fontSize: '0.8rem',
                            marginRight: '0.5rem',
                            display: 'inline-flex',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            color: 'var(--status-online)',
                            border: '1px solid rgba(16, 185, 129, 0.25)',
                            cursor: 'pointer',
                            borderRadius: '6px'
                          }}
                          title="Simulate User"
                        >
                          <Eye size={12} style={{ marginRight: '3px' }} /> Sim
                        </button>
                      )}
                      <button
                        className="btn btn-secondary"
                        onClick={() => startEditUser(user)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', marginRight: '0.5rem', display: 'inline-flex' }}
                        title="Edit User"
                      >
                        <Edit size={12} />
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={user.username === 'admin'}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', display: 'inline-flex' }}
                        title="Delete User"
                      >
                        <Trash size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Add User form */}
          <div className="glass-card">
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '1rem' }}>Create Account</h3>
            
            {userError && (
              <div style={{
                padding: '0.5rem',
                borderRadius: '6px',
                backgroundColor: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid var(--status-critical)',
                color: 'var(--status-critical)',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {userError}
              </div>
            )}

            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Username</label>
                <input
                  type="text"
                  className="input-field"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Password</label>
                <input
                  type="password"
                  className="input-field"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Access Role</label>
                <select
                  className="input-field"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="admin">Administrator</option>
                  <option value="super_admin">Super Admin (System Settings)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" disabled={creatingUser} style={{ marginTop: '0.5rem' }}>
                <UserPlus size={16} />
                {creatingUser ? 'Creating...' : 'Register User'}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Edit User Modal */}
      {editingUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '400px', border: '1px solid var(--border-color-active)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Edit Account: {editingUser.username}</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div style={{ padding: '0.5rem', borderRadius: '6px', backgroundColor: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--status-critical)', color: 'var(--status-critical)', fontSize: '0.8rem', marginBottom: '1rem' }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Username</label>
                <input
                  type="text"
                  className="input-field"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  disabled={editingUser.username === 'admin'}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>New Password (Leave blank to keep current)</label>
                <input
                  type="password"
                  className="input-field"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Access Role</label>
                <select
                  className="input-field"
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editingUser.username === 'admin'}
                >
                  <option value="viewer">Viewer (Read-only)</option>
                  <option value="admin">Administrator</option>
                  <option value="super_admin">Super Admin (System Settings)</option>
                </select>
              </div>

              <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                  disabled={editingUser.username === 'admin'}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--color-primary)' }}
                />
                <label htmlFor="editIsActive" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Account Active</label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingUser}>
                  {savingUser ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
