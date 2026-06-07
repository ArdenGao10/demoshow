import { useEffect } from "react";
import { findForm, DEFAULT_FORM_ID } from "../lib/characters.jsx";
import { formFrames } from "../lib/charFrames.jsx";
import { start as demiStart, stop as demiStop } from "../lib/demiWidget.js";
import Create from "./Create.jsx";

// 演示模式:直接渲染只读版 Create,Demi 走过真实的创建页面,而不是另写一套静态卡片。
const TOUR = [
  { selector: '[data-tour="mode-tabs"]', line: "这里能切换两种玩法:上传 PPT 帮你讲、或者把我嵌进你自己的网站帮你讲。" },
  { selector: '[data-tour="upload"]', line: "第一步,把你的 HTML 幻灯片拖到这个框里,我会自动识别每一页。" },
  { selector: '[data-tour="form"]', line: "上传完之后再挑一个出场形态,我就用这个样子替你讲。点旁边「逛素材库」能看到更多。" },
  { selector: '[data-tour="tone"]', line: "讲解语气随你挑——轻松亲切、专业稳重,还是元气满满。" },
  { selector: '[data-tour="layout"]', line: "演示形态有三种布局:角落陪讲、舞台讲解、画中画。" },
  { selector: '[data-tour="generate"]', line: "最后点这里「生成讲解」,我就开口讲了。整个过程你不用出镜,不用录音。" },
];

export default function Demo({ onBack, onStart }) {
  useEffect(() => {
    const frames = formFrames(findForm(DEFAULT_FORM_ID)); // 尾尾
    // 不自动开讲——给底部播放按钮挂引导,等用户自己点。
    const t = setTimeout(() => demiStart(TOUR, { auto: false, frames }), 500);
    return () => { clearTimeout(t); demiStop(); };
  }, []);

  // readOnly:Create 内部展开所有步骤、屏蔽指针事件,Demi 能完整走完一遍。
  return (
    <Create
      formId={DEFAULT_FORM_ID}
      tone="轻松亲切"
      layout="corner"
      error=""
      onPickForm={() => {}}
      onPickTone={() => {}}
      onPickLayout={() => {}}
      onOpenLibrary={() => {}}
      onGenerate={() => {}}
      onBack={onBack}
      onStartReal={onStart}
      readOnly
    />
  );
}
