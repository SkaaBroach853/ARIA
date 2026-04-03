import React from "react";

function Report() {
  return (
    <div>
      <h2>Investigation Report</h2>

      <div className="card">
        <h3>Summary</h3>
        <p>Brute force attack detected on SSH port.</p>
      </div>

      <div className="card">
        <h3>Evidence</h3>
        <ul>
          <li>Multiple failed SSH logins</li>
          <li>IP: 185.123.9.8</li>
          <li>Unusual login attempts</li>
        </ul>
      </div>

      <div className="card">
        <h3>Recommended Actions</h3>
        <ul>
          <li>Block IP</li>
          <li>Enable MFA</li>
          <li>Reset compromised credentials</li>
        </ul>
      </div>
    </div>
  );
}

export default Report;