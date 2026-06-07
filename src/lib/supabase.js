// Supabase 客户端：填了 env 就是真账号系统，没填则 supabase=null，前端回落到
// 本地点击即进（用户只存 localStorage，刷新不掉）。
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseEnabled = Boolean(url && key);
export const supabase = supabaseEnabled ? createClient(url, key) : null;

export function userFromSession(session) {
  const u = session?.user;
  if (!u) return null;
  return { id: u.id, email: u.email, name: u.user_metadata?.name || u.email?.split("@")[0] || "访客" };
}
