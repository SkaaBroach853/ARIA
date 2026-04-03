import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Sidebar from "./components/Sidebar";
import Threats from "./components/Threats";
import Timeline from "./components/Timeline";
import Logs from "./components/Logs";
import Report from "./components/Report";
import Admin from "./components/Admin";
import Chat from "./pages/Chat";
import DashboardPage from "./pages/DashboardPage";
import Login from "./pages/Login";

function App() {
  return (
    <Router>
      <div className="app-container">
        <Sidebar />

        <div className="main-content">
          <Routes>
            <Route path="/" element={<Chat />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/threats" element={<Threats />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/logs" element={<Logs />} />
            <Route path="/report" element={<Report />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/login" element={<Login />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
