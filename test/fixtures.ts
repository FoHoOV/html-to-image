import pixelmatch from "pixelmatch";
import { expect, test as base } from "vitest";
import { toPng } from "../src";
import type { Options } from "../src/types";

const nativeFetch = window.fetch.bind(window);
const ROOT_ID = "test-root";

function getCaptureNode() {
  return document.getElementById("dom-node") as HTMLDivElement;
}

function getReferenceImage() {
  return document.getElementById("ref-image") as HTMLImageElement;
}

function getResultCanvasNode() {
  return document.getElementById("canvas") as HTMLCanvasElement;
}

function getReferenceCanvasNode() {
  const node = getResultCanvasNode().cloneNode(false) as HTMLCanvasElement;
  node.id = "";
  return node;
}

function getStyleNode() {
  return document.getElementById("style") as HTMLStyleElement;
}

function clean() {
  document.getElementById(ROOT_ID)?.remove();
}

async function setup() {
  const html = await fetchFile("page.html");
  clean();

  const root = document.createElement("div");
  root.id = ROOT_ID;
  root.innerHTML = html;
  document.body.appendChild(root);
}

async function bootstrap(
  htmlUrl: string,
  cssUrl?: string,
  refImageUrl?: string,
) {
  await setup();

  const html = await fetchFile(htmlUrl);
  const captureNode = getCaptureNode();
  captureNode.innerHTML = html;

  if (cssUrl) {
    const css = await fetchFile(cssUrl);
    getStyleNode().appendChild(document.createTextNode(css));
  }

  if (refImageUrl) {
    const url = await fetchFile(refImageUrl);
    await loadImage(getReferenceImage(), url);
  }

  return captureNode;
}

function loadImage(image: HTMLImageElement, src: string) {
  return new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () =>
      reject(new Error(`Failed to load reference image: ${src.slice(0, 64)}`));
    image.src = src;
  });
}

async function fetchFile(fileName: string) {
  const response = await nativeFetch(fileName);
  return response.text();
}

function makeImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = (e) => reject(e);
    image.src = src;
  });
}

function makeCanvas(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  size?: {
    width?: number;
    height?: number;
  },
) {
  const context = canvas.getContext("2d")!;
  const width = size?.width || image.width;
  const height = size?.height || image.height;
  const ratio = window.devicePixelRatio || 1;

  canvas.width = width * ratio;
  canvas.height = height * ratio;
  canvas.style.width = `${width}`;
  canvas.style.height = `${height}`;

  context.imageSmoothingEnabled = false;
  context.drawImage(image, 0, 0);

  return { canvas, context, width, height };
}

function drawImage(
  image: HTMLImageElement,
  canvas: HTMLCanvasElement,
  size?: {
    width?: number;
    height?: number;
  },
) {
  const { context, width, height } = makeCanvas(image, canvas, size);
  return context.getImageData(0, 0, width, height);
}

async function drawDataUrl(
  dataUrl: string,
  size?: {
    width?: number;
    height?: number;
  },
) {
  const image = await makeImage(dataUrl);
  return drawImage(image, getResultCanvasNode(), size);
}

async function check(dataUrl: string, threshold = 0.1) {
  const imageData = await drawDataUrl(dataUrl);
  compareToRefImage(imageData, threshold);
}

async function renderAndCheck(
  node: HTMLDivElement = getCaptureNode(),
  options: Options = {},
  threshold = 0.1,
) {
  const dataUrl = await toPng(node, options);
  await check(dataUrl, threshold);
}

async function renderAndCompareToCanvas(
  canvas: HTMLCanvasElement,
  node: HTMLDivElement = getCaptureNode(),
  options: Options = {},
  threshold = 0.1,
) {
  const dataUrl = await toPng(node, options);
  const output = await makeImage(dataUrl);
  const actual = getImageData(output, output.width, output.height);
  const expected = getImageData(canvas, output.width, output.height);

  const mismatchedPixels = pixelmatch(
    actual.data,
    expected.data,
    null,
    output.width,
    output.height,
    { threshold },
  );

  expect(mismatchedPixels).toBeLessThan(100);
}

function compareToRefImage(sourceData: ImageData, threshold = 0.1) {
  const reference = getReferenceImage();
  const referenceData = drawImage(reference, getReferenceCanvasNode());
  const mismatchedPixels = pixelmatch(
    sourceData.data,
    referenceData.data,
    null,
    reference.width,
    reference.height,
    { threshold },
  );

  expect(mismatchedPixels).toBeLessThan(100);
}

function getImageData(
  source: CanvasImageSource,
  width: number,
  height: number,
) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = width;
  canvas.height = height;
  context.drawImage(source, 0, 0, width, height);

  return context.getImageData(0, 0, width, height);
}

async function getSvgDocument(dataUrl: string) {
  const response = await nativeFetch(dataUrl);
  const svg = await response.text();
  return new DOMParser().parseFromString(svg, "text/xml");
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface BrowserFixtures {
  bootstrap: typeof bootstrap;
  check: typeof check;
  compareToRefImage: typeof compareToRefImage;
  delay: typeof delay;
  drawDataUrl: typeof drawDataUrl;
  getSvgDocument: typeof getSvgDocument;
  renderAndCheck: typeof renderAndCheck;
  renderAndCompareCanvas: typeof renderAndCompareToCanvas;
}

/* eslint-disable no-empty-pattern -- Vitest requires fixture dependencies to use object destructuring. */
export const test = base.extend<BrowserFixtures>({
  bootstrap: async ({}, use) => {
    await use(bootstrap);
  },
  check: async ({}, use) => {
    await use(check);
  },
  compareToRefImage: async ({}, use) => {
    await use(compareToRefImage);
  },
  delay: async ({}, use) => {
    await use(delay);
  },
  drawDataUrl: async ({}, use) => {
    await use(drawDataUrl);
  },
  getSvgDocument: async ({}, use) => {
    await use(getSvgDocument);
  },
  renderAndCheck: async ({}, use) => {
    await use(renderAndCheck);
  },
  renderAndCompareCanvas: async ({}, use) => {
    await use(renderAndCompareToCanvas);
  },
});
/* eslint-enable no-empty-pattern */
