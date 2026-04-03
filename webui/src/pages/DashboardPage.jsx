import React from "react";

function DashboardPage() {
  return (
    <div>
      <h2>Dashboard</h2>

      <div className="card">Active Threats: 3</div>
      <div className="card">Logs Processed: 1200</div>
      <div className="card">Alerts: 5</div>
    </div>
  );
}

export default DashboardPage;