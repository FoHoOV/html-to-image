import { toDataUrl } from "../../src";
import { test } from "../fixtures";

function createBackgroundNode(url: string) {
  const node = document.createElement("div");
  node.style.cssText = `width: 10px; height: 10px; background-image: url(${url});`;
  return node;
}

describe("background-image embedding", () => {
  test("should skip data urls without fetching them", async () => {
    const fetchSpy = vi.spyOn(window, "fetch");

    await toDataUrl(createBackgroundNode("data:image/png;base64,AAAA"));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("should leave a failed background image empty when no placeholder is given", async ({
    getSvgDocument,
  }) => {
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));

    const svg = await getSvgDocument(
      await toDataUrl(createBackgroundNode("http://acme.invalid/missing.png")),
    );

    // Computed style serializes this as the `background` shorthand (its exact
    // trailing sub-properties differ per engine), with the url() quoted.
    expect(svg.querySelector("div")?.getAttribute("style")).toContain(
      'background: url("")',
    );
  });

  test("should substitute a placeholder for a failed background image", async ({
    getSvgDocument,
  }) => {
    vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));
    const placeholder = "data:image/png;base64,placeholder";

    const svg = await getSvgDocument(
      await toDataUrl(createBackgroundNode("http://acme.invalid/missing.png"), {
        imagePlaceholder: placeholder,
      }),
    );

    expect(svg.querySelector("div")?.getAttribute("style")).toContain(
      `url("${placeholder}")`,
    );
  });

  test("should fetch and decode a background image shared by two elements only once", async () => {
    vi.spyOn(window, "fetch").mockResolvedValue(
      new Response("A", { headers: { "Content-Type": "image/png" } }),
    );
    const fetchSpy = vi.spyOn(window, "fetch");
    const readSpy = vi.spyOn(FileReader.prototype, "readAsDataURL");

    const root = document.createElement("div");
    root.appendChild(createBackgroundNode("/shared-background.png"));
    root.appendChild(createBackgroundNode("/shared-background.png"));

    await toDataUrl(root);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    // The fetch itself is deduplicated by FetchCache; this additionally
    // confirms the FileReader-based binary-to-base64 conversion of the
    // already-resolved resource is shared too, not repeated per consumer.
    expect(readSpy).toHaveBeenCalledTimes(1);
  });
});
