import React from "react";

function Timeline() {
  return (
    <div className="card">
      <h3>Active Investigation Timeline</h3>

      <ul>
        <li>23:02:11 - External Scan from 185.123.9.8</li>
        <li>23:05:45 - Brute Force Start (SSH)</li>
        <li>03:00:12 - Failed login spike ⚠️</li>
        <li>01:05:55 - User admin locked</li>
      </ul>
    </div>
  );
}

export default Timeline;