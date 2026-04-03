import React from "react";

function Login() {
  return (
    <div className="card">
      <h2>Login</h2>
      <input placeholder="Username" />
      <input placeholder="Password" type="password" />
      <button>Login</button>
    </div>
  );
}

export default Login;