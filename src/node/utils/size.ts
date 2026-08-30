import { getComputedStyle } from "./style";

function px(node: HTMLElement, styleProperty: string) {
  const val = getComputedStyle(node).getPropertyValue(styleProperty);
  return val ? parseFloat(val.replace("px", "")) : 0;
}

export function getNodeWidth(node: HTMLElement) {
  const leftBorder = px(node, "border-left-width");
  const rightBorder = px(node, "border-right-width");
  return node.clientWidth + leftBorder + rightBorder;
}

export function getNodeHeight(node: HTMLElement) {
  const topBorder = px(node, "border-top-width");
  const bottomBorder = px(node, "border-bottom-width");
  return node.clientHeight + topBorder + bottomBorder;
}

export function checkCanvasDimensions(canvas: HTMLCanvasElement) {
  // @see https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size
  const canvasDimensionLimit = 16384;
  if (
    canvas.width > canvasDimensionLimit ||
    canvas.height > canvasDimensionLimit
  ) {
    if (
      canvas.width > canvasDimensionLimit &&
      canvas.height > canvasDimensionLimit
    ) {
      if (canvas.width > canvas.height) {
        canvas.height *= canvasDimensionLimit / canvas.width;
        canvas.width = canvasDimensionLimit;
      } else {
        canvas.width *= canvasDimensionLimit / canvas.height;
        canvas.height = canvasDimensionLimit;
      }
    } else if (canvas.width > canvasDimensionLimit) {
      canvas.height *= canvasDimensionLimit / canvas.width;
      canvas.width = canvasDimensionLimit;
    } else {
      canvas.width *= canvasDimensionLimit / canvas.height;
      canvas.height = canvasDimensionLimit;
    }
  }
}
