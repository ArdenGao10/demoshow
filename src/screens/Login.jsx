import { useState } from "react";
import { FormGlyph, HUMANS } from "../lib/characters.jsx";
import { BlackCat, GrassTuft } from "../lib/demi.jsx";
import { Brand } from "./Landing.jsx";
import { supabase, supabaseEnabled, userFromSession } from "../lib/supabase.js";

export default function Login({ onAuth, onBack }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    // 没配 Supabase：本地点击即进的演示登录。user 存进 localStorage，刷新不掉。
    if (!supabaseEnabled) {
      const display = name.trim() || (email.split("@")[0] || "访客");
      const user = { id: "local-demo", name: display, email: email.trim() || "guest@demi.local" };
      localStorage.setItem("demi_local_user", JSON.stringify(user));
      onAuth(user);
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("请输入有效邮箱");
    if (password.length < 6) return setError("密码至少 6 位");

    setBusy(true);
    try {
      if (mode === "register") {
        const display = name.trim() || email.split("@")[0];
        const { data, error: err } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: display } },
        });
        if (err) throw err;
        // 项目若开了邮箱确认，session 会是 null；提示用户去邮箱激活。
        const user = userFromSession(data.session);
        if (user) onAuth(user);
        else setError("注册成功，请到邮箱完成验证后再登录");
      } else {
        const { data, error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) throw err;
        const user = userFromSession(data.session);
        if (user) onAuth(user);
        else setError("登录返回为空，请重试");
      }
    } catch (err) {
      setError(err?.message || (mode === "login" ? "登录失败" : "注册失败"));
    } finally {
      setBusy(false);
    }
  };

  return <div className="screen speckle" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
    <button onClick={onBack} style={{ position: "absolute", top: 24, left: 28, border: 0, background: "transparent", cursor: "pointer" }}><Brand /></button>
    <div style={{ position: "relative", width: 430 }}>
      <FormGlyph form={HUMANS[5]} style={{ height: 168, position: "absolute", left: "50%", top: -148, transform: "translateX(-50%)", zIndex: 2 }} />
      <form className="sketch" onSubmit={submit} style={{ padding: "50px 40px 30px" }}>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 18 }}><button type="button" className="chip" onClick={() => { setMode("login"); setError(""); }} style={{ cursor: "pointer", background: mode === "login" ? "var(--orange-pale)" : "#fff" }}>登录</button><button type="button" className="chip" onClick={() => { setMode("register"); setError(""); }} style={{ cursor: "pointer", background: mode === "register" ? "var(--orange-pale)" : "#fff" }}>注册</button></div>
        <h1 className="h-title" style={{ margin: "0 0 6px", textAlign: "center" }}>{mode === "login" ? "欢迎回来" : "创建 Demi 账号"}</h1>
        {!supabaseEnabled && <div className="hand" style={{ textAlign: "center", color: "var(--ink-soft)", fontSize: 17, margin: "0 0 16px" }}>演示模式 · 随便填即可进入</div>}
        {supabaseEnabled && <div style={{ height: 14 }} />}
        {mode === "register" && <Field label="昵称" value={name} onChange={setName} placeholder="怎么称呼你" />}
        <Field label="邮箱" type="email" value={email} onChange={setEmail} placeholder="you@studio.com" />
        <Field label="密码" type="password" value={password} onChange={setPassword} placeholder="至少 6 位" />
        {error && <div style={{ color: "#a33", fontSize: 13, fontWeight: 700, marginBottom: 12 }}>{error}</div>}
        <button type="submit" className="btn-demi" disabled={busy} style={{ width: "100%", justifyContent: "center", opacity: busy ? .6 : 1 }}>{busy ? "稍等…" : mode === "login" ? "登录并继续 →" : "注册并开始 →"}</button>
      </form>
    </div>
    <BlackCat style={{ height: 50, position: "absolute", bottom: 42, left: 150 }} /><GrassTuft style={{ height: 34, position: "absolute", bottom: 40, left: 250 }} />
  </div>;
}

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 14 }}>{label}<input type={type} className="field" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ marginTop: 6 }} /></label>;
}
