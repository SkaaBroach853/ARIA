import React, { useEffect, useState } from "react";
import socket from "../services/socket";

const fallbackLogs = [
  {
    time: "23:02:11",
    severity: "medium",
    source: "185.123.9.8",
    message: "External host started a high-volume TCP scan against multiple ports."
  },
  {
    time: "23:05:45",
    severity: "high",
    source: "185.123.9.8",
    message: "Repeated SSH authentication failures detected for account 'admin'."
  },
  {
    time: "23:06:18",
    severity: "high",
    source: "185.123.9.8",
    message: "Brute-force pattern confirmed after 25 failed login attempts in 33 seconds."
  },
  {
    time: "23:08:04",
    severity: "critical",
    source: "185.123.9.8",
    message: "Suspicious credential reuse observed against VPN and SSH services."
  },
  {
    time: "23:11:27",
    severity: "critical",
    source: "10.0.4.23",
    message: "Possible lateral movement: internal host contacted after suspected compromise."
  }
];

function normalizeLog(data) {
  if (typeof data === "string") {
    return {
      time: "now",
      severity: "medium",
      message: data
    };
  }

  if (!data || typeof data !== "object") {
    return {
      time: "now",
      severity: "medium",
      message: String(data)
    };
  }

  const severity =
    typeof data.severity === "string" && ["low", "medium", "high", "critical"].includes(data.severity.toLowerCase())
      ? data.severity.toLowerCase()
      : "medium";

  const message =
    typeof data.message === "string"
      ? data.message
      : typeof data.log === "string"
        ? data.log
        : typeof data.event === "string"
          ? data.event
          : JSON.stringify(data);

  return {
    time: typeof data.time === "string" ? data.time : "now",
    severity,
    source: typeof data.source === "string" ? data.source : typeof data.ip === "string" ? data.ip : "",
    message
  };
}

function Logs() {
  const [logs, setLogs] = useState([]);
  const [feedMode, setFeedMode] = useState("waiting");

  useEffect(() => {
    let hasLiveData = false;
    let fallbackIndex = 0;

    const handleLogUpdate = (data) => {
      hasLiveData = true;
      setFeedMode("live");
      setLogs((prev) => [normalizeLog(data), ...prev].slice(0, 50));
    };

    socket.on("log_update", handleLogUpdate);

    const fallbackTimer = window.setInterval(() => {
      if (hasLiveData || fallbackIndex >= fallbackLogs.length) {
        if (hasLiveData) {
          setFeedMode("live");
        }
        return;
      }

      setFeedMode("simulated");
      setLogs((prev) => [normalizeLog(fallbackLogs[fallbackIndex]), ...prev].slice(0, 50));
      fallbackIndex += 1;
    }, 1400);

    const liveCheck = window.setTimeout(() => {
      if (!hasLiveData) {
        setFeedMode("simulated");
      }
    }, 1200);

    return () => {
      socket.off("log_update", handleLogUpdate);
      window.clearInterval(fallbackTimer);
      window.clearTimeout(liveCheck);
    };
  }, []);

  return (
    <div>
      <h2>Live Logs</h2>

      <div className="card">
        <p className="logs-status">
          Feed: {feedMode === "live" ? "Live backend stream" : feedMode === "simulated" ? "Suspicious activity demo stream" : "Waiting for events..."}
        </p>

        {logs.length === 0 ? (
          <p>No events received yet.</p>
        ) : (
          <div className="logs-list">
            {logs.map((log, i) => (
              <div key={`${log.time ?? "event"}-${i}`} className="log-entry">
                <span className={`log-severity severity-${log.severity ?? "medium"}`}>
                  {(log.severity ?? "medium").toUpperCase()}
                </span>
                <div>
                  <p className="log-message">{String(log.message ?? "")}</p>
                  <p className="log-meta">
                    {log.time ?? "now"} {log.source ? `| Source: ${log.source}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Logs;
