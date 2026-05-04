import React, { useState } from "react";

export default function JoinUsScreen() {
  const [role, setRole] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <section className="screen">

      <div className="back-header">
        <div></div>
        <div className="title">Join Hessa</div>
        <div></div>
      </div>

      <div style={{ marginTop: 20 }}>
        <div>Select Category</div>
        <select
          className="link-input"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="">Select</option>
          <option value="creator">Content Creator</option>
          <option value="model">Model</option>
          <option value="editor">Editor</option>
          <option value="intern">Intern</option>
        </select>
      </div>

      <div style={{ marginTop: 14 }}>
        <input
          className="link-input"
          placeholder="Your Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <input
          className="link-input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 14 }}>
        <input
          className="link-input"
          placeholder="Phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>

      <div className="btn btn--primary" style={{ marginTop: 20 }}>
        Submit Application
      </div>

      <div style={{ marginTop: 20, fontSize: 12, color: "#888" }}>
        Hessa Search Support  
        support@hessa.ai
      </div>

      <div style={{ marginTop: 10, fontSize: 12 }}>
        Jobs & Careers coming soon
      </div>

    </section>
  );
}