import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("work with video element", () => {
  test("should render video element", async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "media/video/node.html",
      "media/video/style.css",
      "media/video/reference",
    );
    await delay(1000);

    const video = node.querySelector("video")!;
    await waitForVideoData(video);
    video.pause();
    video.currentTime = 0;
    await waitForVideoSeek(video);
    await waitForVideoFrame(video);
    await renderAndCheck(node);
  });

  test("should render video element with poster", async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "media/video/poster.html",
      "media/video/style.css",
      "media/video/reference-poster",
    );
    await delay(1000);
    await renderAndCheck(node);
  });

  test("should carry the video's style onto its replacement image", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    // A poster image is a static bitmap, so object-fit/object-position crop
    // math would rasterize identically everywhere; the risk here is browser
    // JPEG/PNG scaling artifacts, so this asserts the output's style rather
    // than pixels.
    const node = await bootstrap(
      "media/video/object-fit.html",
      "media/video/style.css",
    );

    const svg = await getSvgDocument(await toDataUrl(node));
    const image = svg.querySelector("img")!;

    expect(image.getAttribute("style")).toContain("object-fit: cover");
    expect(image.getAttribute("style")).toContain("object-position: 25% 75%");
  });
});

function waitForVideoData(video: HTMLVideoElement) {
  if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    return Promise.resolve();
  }

  return waitForVideoEvent(video, "loadeddata");
}

function waitForVideoSeek(video: HTMLVideoElement) {
  if (!video.seeking) {
    return Promise.resolve();
  }

  return waitForVideoEvent(video, "seeked");
}

function waitForVideoFrame(video: HTMLVideoElement) {
  return new Promise<void>((resolve) => {
    video.ownerDocument.defaultView!.requestAnimationFrame(() => {
      video.ownerDocument.defaultView!.requestAnimationFrame(() => resolve());
    });
  });
}

function waitForVideoEvent(
  video: HTMLVideoElement,
  event: "loadeddata" | "seeked",
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener(event, handleEvent);
      video.removeEventListener("error", handleError);
    };
    const handleEvent = () => {
      cleanup();
      resolve();
    };
    const handleError = () => {
      cleanup();
      reject(video.error ?? new Error("Failed to load video frame"));
    };

    video.addEventListener(event, handleEvent);
    video.addEventListener("error", handleError);
  });
}
