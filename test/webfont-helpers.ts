import * as htmlToImage from "../src";
import type { Options } from "../src";

export function addStyle(cssText: string, targetDocument = document) {
  const style = targetDocument.createElement("style");
  style.textContent = cssText;
  targetDocument.head.appendChild(style);
  return style;
}

export function addRoot(fontFamily: string, targetDocument = document) {
  const root = targetDocument.createElement("div");
  root.style.fontFamily = fontFamily;
  root.textContent = "Font test";
  targetDocument.body.appendChild(root);
  return root;
}

export async function getEmbeddedFontCSS(
  root: HTMLElement,
  getSvgDocument: (dataUrl: string) => Promise<Document>,
  options: Options = {},
) {
  const dataUrl = await htmlToImage.toDataUrl(root, options);
  const output = await getSvgDocument(dataUrl);
  return {
    cssText: output.querySelector("style")?.textContent ?? "",
    output,
  };
}
