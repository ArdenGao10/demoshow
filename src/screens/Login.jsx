import { useState } from "react";
import { FormGlyph, HUMANS } from "../lib/characters.jsx";
import { BlackCat, GrassTuft } from "../lib/demi.jsx";
import { Brand } from "./Landing.jsx";

export default function Login({ onAuth, onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, email, password }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "操作失败");
      localStorage.setItem("demi_token", data.token);
      onAuth(data.user);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  return <div className="screen speckle" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <button onClick={onBack} style={{ position: "absolute", top: 24, left: 28, border: 0, background: "transparent", cursor: "pointer" }}><Brand /></button>
    <div style={{ position: "relative", width: 430 }}>
      <FormGlyph form={HUMANS[5]} style={{ height: 168, position: "absolute", left: "50%", top: -148, transform: "translateX(-50%)", zIndex: 2 }} />
      <form className="sketch" onSubmit={submit} style={{ padding: "50px 40px 30px" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}><button type="button" className="chip" onClick={() => setMode("login")} style={{ cursor: "pointer", background: mode === "login" ? "var(--orange-pale)" : "#fff" }}>登录</button><button type="button" className="chip" onClick={() => setMode("register")} style={{ cursor: "pointer", background: mode === "register" ? "var(--orange-pale)" : "#fff" }}>注册</button></div>
        <h1 className="h-title" style={{ margin: "0 0 20px", textAlign: "center" }}>{mode === "login" ? "欢迎回来" : "创建 Demi 账号"}</h1>
        {mode === "register" && <Field label="昵称" value={name} onChange={setName} placeholder="怎么称呼你" />}
        <Field label="邮箱" type="email" value={email} onChange={setEmail} placeholder="you@studio.com" />
        <Field label="密码" type="password" value={password} onChange={setPassword} placeholder="至少 6 位" />
        {error && <div style={{ color: "#a33", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
        <button type="submit" className="btn-demi" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>{busy ? "处理中…" : mode === "login" ? "登录并继续 →" : "注册并开始 →"}</button>
      </form>
    </div>
    <BlackCat style={{ height: 50, position: "absolute", bottom: 42, left: 150 }} /><GrassTuft style={{ height: 34, position: "absolute", bottom: 40, left: 250 }} />
  </div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 14 }}>{label}<input required type={type} className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ marginTop: 6 }} /></label>;
}
