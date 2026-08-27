import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("work with iframe element", () => {
  test("should render same-origin iframe body contents", async ({
    getSvgDocument,
  }) => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    try {
      const iframeBody = iframe.contentDocument!.body;
      const child = iframe.contentDocument!.createElement("span");
      child.textContent = "iframe content";
      iframeBody.appendChild(child);

      const svg = await getSvgDocument(await toDataUrl(iframe));

      expect(svg.querySelector("span")?.textContent).toBe("iframe content");
    } finally {
      iframe.remove();
    }
  });
});
