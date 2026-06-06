// charFrames.jsx — 把素材库里的某个形态渲染成「悬浮小人」用的两帧 SVG 字符串：
// 闭嘴(idle) + 张嘴(talk)。讲解时在两帧间切换即可做出说话的嘴型。
import { renderToStaticMarkup } from "react-dom/server";
import { FormGlyph } from "./characters.jsx";

export function formFrames(form, height = 150) {
  if (!form) return null;
  return {
    idle: renderToStaticMarkup(<FormGlyph form={form} expr="smile" height={height} />),
    talk: renderToStaticMarkup(<FormGlyph form={form} expr="wow" height={height} />),
  };
}
