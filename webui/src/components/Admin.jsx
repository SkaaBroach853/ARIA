import React from "react";

function Admin() {
  return (
    <div>
      <h2>Admin Panel</h2>

      <div className="card">
        <h3>User Management</h3>
        <p>Manage roles, access, and permissions.</p>
      </div>

      <div className="card">
        <h3>System Settings</h3>
        <p>Configure API keys, security rules, and integrations.</p>
      </div>
    </div>
  );
}

export default Admin;