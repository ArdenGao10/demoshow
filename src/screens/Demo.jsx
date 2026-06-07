import { useEffect, useState } from "react";
import { findForm, DEFAULT_FORM_ID } from "../lib/characters.jsx";
import { formFrames } from "../lib/charFrames.jsx";
import { start as demiStart, stop as demiStop } from "../lib/demiWidget.js";
import Create from "./Create.jsx";

// 演示模式:直接渲染只读版 Create,Demi 走过真实的创建页面,而不是另写一套静态卡片。
// tour 走完上传 PPT 那一条线后,通过 onEnter 切到嵌入模式,把另一条线也演示掉。
function buildTour(setMode) {
  return [
    { selector: '[data-tour="mode-tabs"]', line: "这里能切换两种玩法:上传 PPT 帮你讲、或者把我嵌进你自己的网站帮你讲。" },
    { selector: '[data-tour="upload"]', line: "先看第一种:把你的 HTML 幻灯片拖到这个框里,我会自动识别每一页。" },
    { selector: '[data-tour="form"]', line: "上传完之后再挑一个出场形态,我就用这个样子替你讲。点旁边「逛素材库」能看到更多。" },
    { selector: '[data-tour="tone"]', line: "讲解语气随你挑——轻松亲切、专业稳重,还是元气满满。" },
    { selector: '[data-tour="layout"]', line: "演示形态有三种布局:角落陪讲、舞台讲解、画中画。" },
    { selector: '[data-tour="generate"]', line: "最后点这里「生成讲解」,我就开口讲了。整个过程你不用出镜,不用录音。" },
    { selector: '[data-tour="embed-lines"]', line: "再看第二种玩法:嵌入你自己的网站。在这里一行一句写好导览词,我就会按顺序走过去讲。", onEnter: () => setMode("embed") },
    { selector: '[data-tour="embed-snippet"]', line: "复制这段嵌入代码,贴到你自己网站的 HTML 里,把 selector 换成你的真实元素,我就出现在你网站上替你讲了。" },
  ];
}

export default function Demo({ onBack, onStart }) {
  const [mode, setMode] = useState("ppt");

  useEffect(() => {
    const frames = formFrames(findForm(DEFAULT_FORM_ID)); // 尾尾
    // 不自动开讲——给底部播放按钮挂引导,等用户自己点。
    const t = setTimeout(() => demiStart(buildTour(setMode), { auto: false, frames }), 500);
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
      mode={mode}
      onModeChange={setMode}
    />
  );
}
