import { cloneNodeTree } from "../../src/node";
import { createContext } from "../../src/context";
import { getComputedStyle } from "../../src/node/utils";
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

  test("should copy computed video styles to the replacement image", async ({
    bootstrap,
  }) => {
    const root = await bootstrap(
      "media/video/poster.html",
      "media/video/style.css",
    );
    const video = root.querySelector("video")!;
    video.style.objectFit = "cover";
    video.style.objectPosition = "25% 75%";
    const originalNodeStyles = getComputedStyle(video);

    const image = await cloneNodeTree(video, createContext());
    const clonedNodeStyles = getComputedStyle(image);
    root.appendChild(image);

    expect(image).toEqual(expect.any(HTMLImageElement));
    expect(clonedNodeStyles.width).toBe(originalNodeStyles.width);
    expect(clonedNodeStyles.height).toBe(originalNodeStyles.height);
    expect(clonedNodeStyles.objectFit).toBe(originalNodeStyles.objectFit);
    expect(clonedNodeStyles.objectPosition).toBe(
      originalNodeStyles.objectPosition,
    );

    image.remove();
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
