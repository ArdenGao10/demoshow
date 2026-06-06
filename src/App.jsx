import { useCallback, useEffect, useState } from "react";
import { SketchDefs } from "./lib/demi.jsx";
import { findForm, DEFAULT_FORM_ID } from "./lib/characters.jsx";
import { generateScripts } from "./lib/glm.js";
import Landing from "./screens/Landing.jsx";
import Login from "./screens/Login.jsx";
import Create from "./screens/Create.jsx";
import Library from "./screens/Library.jsx";
import Loading from "./screens/Loading.jsx";
import Play from "./screens/Play.jsx";
import Demo from "./screens/Demo.jsx";

// Top-level state machine for the main line:
//   选 Demi → 上传内容 → GLM 生成讲稿 → 逐页语音+动效播放
export default function App() {
  const [route, setRoute] = useState("landing"); // landing|login|create|library|loading|play|demo
  const [libFrom, setLibFrom] = useState("create"); // 素材库从哪进来的，决定返回去哪
  const [formId, setFormId] = useState(DEFAULT_FORM_ID); // 伟伟
  const [tone, setTone] = useState("轻松亲切");
  const [layout, setLayout] = useState("corner"); // corner|runway|pip
  const [deck, setDeck] = useState(null); // parsed HTML deck
  const [scripts, setScripts] = useState(null); // GLM narration, one line per page
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);

  const form = findForm(formId);

  // restore palette on boot
  useEffect(() => {
    const p = localStorage.getItem("demi_palette") || "warm";
    document.documentElement.setAttribute("data-palette", p);
    const token = localStorage.getItem("demi_token");
    if (token) fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.ok ? r.json() : Promise.reject()).then((d) => setUser(d.user)).catch(() => localStorage.removeItem("demi_token"));
  }, []);

  const go = useCallback((r) => {
    setError("");
    setRoute(r);
  }, []);

  // Create page hands us the parsed deck → generate → play.
  const handleGenerate = useCallback(
    async (parsedDeck) => {
      setDeck(parsedDeck);
      setScripts(null);
      setError("");
      // 内置讲稿（如 Demi 示例稿）：直接用，不必走 GLM。
      if (parsedDeck.builtinScripts) {
        setScripts(parsedDeck.builtinScripts);
        setRoute("play");
        return;
      }
      setRoute("loading");
      try {
        const result = await generateScripts({
          presenterName: form?.name || "Demi",
          tone,
          slides: parsedDeck.slides,
        });
        setScripts(result);
        setRoute("play");
      } catch (e) {
        setError(e.message || "讲稿生成失败");
        setRoute("create");
      }
    },
    [form, tone]
  );

  return (
    <>
      <SketchDefs />
      {route === "landing" && <Landing user={user} onStart={() => go(user ? "create" : "login")} onDemo={() => go("demo")} onLibrary={() => { setLibFrom("landing"); go("library"); }} onLogin={() => go("login")} onLogout={() => { localStorage.removeItem("demi_token"); setUser(null); }} />}
      {route === "demo" && <Demo onBack={() => go("landing")} onStart={() => go(user ? "create" : "login")} />}
      {route === "login" && <Login onAuth={(nextUser) => { setUser(nextUser); go("create"); }} onBack={() => go("landing")} />}
      {route === "create" && (
        <Create
          formId={formId}
          tone={tone}
          layout={layout}
          error={error}
          onPickForm={setFormId}
          onPickTone={setTone}
          onPickLayout={setLayout}
          onOpenLibrary={() => { setLibFrom("create"); go("library"); }}
          onGenerate={handleGenerate}
          onBack={() => go("landing")}
        />
      )}
      {route === "library" && (
        <Library
          formId={formId}
          onUse={(id) => {
            setFormId(id);
            go("create");
          }}
          onBack={() => go(libFrom)}
        />
      )}
      {route === "loading" && <Loading form={form} deck={deck} />}
      {route === "play" && (
        <Play
          form={form}
          deck={deck}
          scripts={scripts}
          layout={layout}
          onExit={() => go("create")}
        />
      )}
    </>
  );
}
