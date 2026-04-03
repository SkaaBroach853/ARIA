import React from "react";
import { Link } from "react-router-dom";

function Sidebar() {
  return (
    <div className="sidebar">
      <h2>CyberGuard</h2>

      <Link to="/dashboard">Dashboard</Link>
      <Link to="/chat">Chat</Link>
      <Link to="/threats">Threats</Link>
      <Link to="/timeline">Timeline</Link>
      <Link to="/logs">Logs</Link>
      <Link to="/report">Report</Link>
      <Link to="/admin">Admin</Link>
    </div>
  );
}

export default Sidebar;
