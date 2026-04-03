import React from "react";
import AIChat from "../components/AIChat";
import Threats from "../components/Threats";
import Timeline from "../components/Timeline";

function Chat() {
  return (
    <div style={{ display: "flex", gap: "20px" }}>
      
      {/* Chat Section */}
      <div style={{ flex: 2 }}>
        <h2>Chat</h2>
        <AIChat />
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1 }}>
        <Threats />
        <Timeline />
      </div>

    </div>
  );
}

export default Chat;