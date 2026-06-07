import { useCallback, useEffect, useState } from "react";
import { SketchDefs } from "./lib/demi.jsx";
import { findForm, DEFAULT_FORM_ID } from "./lib/characters.jsx";
import { generateScripts } from "./lib/glm.js";
import { supabase, supabaseEnabled, userFromSession } from "./lib/supabase.js";
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

  // restore palette + create-page selections + user session on boot
  useEffect(() => {
    const p = localStorage.getItem("demi_palette") || "warm";
    document.documentElement.setAttribute("data-palette", p);
    const savedForm = localStorage.getItem("demi_formId");
    if (savedForm && findForm(savedForm)) setFormId(savedForm);
    const savedTone = localStorage.getItem("demi_tone");
    if (savedTone) setTone(savedTone);
    const savedLayout = localStorage.getItem("demi_layout");
    if (savedLayout === "corner" || savedLayout === "runway" || savedLayout === "pip") setLayout(savedLayout);

    if (supabaseEnabled) {
      supabase.auth.getSession().then(({ data }) => setUser(userFromSession(data.session)));
      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setUser(userFromSession(session)));
      return () => sub?.subscription?.unsubscribe?.();
    }
    // 演示模式：从 localStorage 还原本地 user，刷新不掉。
    try {
      const raw = localStorage.getItem("demi_local_user");
      if (raw) setUser(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { localStorage.setItem("demi_formId", formId); }, [formId]);
  useEffect(() => { localStorage.setItem("demi_tone", tone); }, [tone]);
  useEffect(() => { localStorage.setItem("demi_layout", layout); }, [layout]);

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

  const handleLogout = useCallback(async () => {
    if (supabaseEnabled) await supabase.auth.signOut().catch(() => {});
    localStorage.removeItem("demi_local_user");
    localStorage.removeItem("demi_token");
    // 退出后把草稿一并清掉，下一个登录的人从干净状态开始。
    localStorage.removeItem("demi_draft_deck");
    localStorage.removeItem("demi_formId");
    localStorage.removeItem("demi_tone");
    localStorage.removeItem("demi_layout");
    setUser(null);
    setDeck(null);
    setScripts(null);
    setFormId(DEFAULT_FORM_ID);
    setTone("轻松亲切");
    setLayout("corner");
  }, []);

  return (
    <>
      <SketchDefs />
      {route === "landing" && <Landing user={user} onStart={() => go(user ? "create" : "login")} onDemo={() => go("demo")} onLibrary={() => { setLibFrom("landing"); go("library"); }} onLogin={() => go("login")} onLogout={handleLogout} />}
      {route === "demo" && <Demo onBack={() => go("landing")} onStart={() => go(user ? "create" : "login")} />}
      {route === "login" && <Login onAuth={(nextUser) => { setUser(nextUser); go("landing"); }} onBack={() => go("landing")} />}
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
