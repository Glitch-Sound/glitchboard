// 通常レイアウトの検証専用入口。製品のルーティングには含めない。
import { createRoot } from "react-dom/client";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/index.js";
import "../../packages/webview/src/app/style.css";
const root=document.getElementById("root");
if (!root) throw new Error("rootがない");
root.style.cssText="display:flex;justify-content:flex-end;padding:24px";
createRoot(root).render(<InlineAdd kind="event" projects={[{id:"project",name:"Alpha"}]} onSubmit={values=>{window.parent.postMessage({type:"fixtureAdd",...values},"*");return true;}}/>);
