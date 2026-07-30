import { cloneNodeTree } from "../../src/node";
import { createContext } from "../../src/context";

describe("work with iframe element", () => {
  test("should clone same-origin iframe body contents", async () => {
    const iframe = document.createElement("iframe");
    document.body.appendChild(iframe);

    try {
      const iframeBody = iframe.contentDocument!.body;
      const child = iframe.contentDocument!.createElement("span");
      child.textContent = "iframe content";
      iframeBody.appendChild(child);

      const clone = await cloneNodeTree(iframe, createContext());

      expect(clone?.nodeName).toBe("BODY");
      expect(clone?.querySelector("span")?.textContent).toBe("iframe content");
    } finally {
      iframe.remove();
    }
  });
});
