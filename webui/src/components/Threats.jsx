import React from "react";

function Threats() {
  return (
    <div className="card">
      <h3>Threat Intelligence (MITRE ATT&CK)</h3>

      <ul>
        <li>T1110.001 - Brute Force (Password Guessing)</li>
        <li>T1110.003 - Password Spraying</li>
        <li>T1110.004 - Credential Stuffing</li>
      </ul>

      <p style={{ marginTop: "10px", color: "#60a5fa" }}>
        Mapping suggests known frameworks
      </p>
    </div>
  );
}

export default Threats;