import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("background-image embedding", () => {
  test("embeds a background image declared by a stylesheet", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const node = await bootstrap(
      "media/background-image/node.html",
      "media/background-image/style.css",
    );
    const svg = await getSvgDocument(await toDataUrl(node));
    const style =
      svg.querySelector(".with-background")?.getAttribute("style") ?? "";

    expect(style).toContain("data:image/jpeg");
    expect(style).not.toContain("/media/images/image.jpeg");
  });

  test("prefers an options.style background over the node's own", async ({
    bootstrap,
    getSvgDocument,
  }) => {
    const node = await bootstrap(
      "media/background-override/node.html",
      "media/background-override/style.css",
    );
    const svg = await getSvgDocument(
      await toDataUrl(node, {
        style: { backgroundImage: "url(/media/images/image.png)" },
      }),
    );
    const style = svg.querySelector("#dom-node")?.getAttribute("style") ?? "";

    // The override is a `background-image` longhand on the clone, while the
    // stylesheet reaches the original as a `background` shorthand. The clone
    // has to win regardless of which property name carries the value.
    expect(style).toContain("data:image/png");
    expect(style).not.toContain("data:image/jpeg");
  });

  test("should skip data urls without fetching them", async ({
    createBackgroundNode,
  }) => {
    const fetchSpy = vi.spyOn(window, "fetch");

    await toDataUrl(createBackgroundNode("data:image/png;base64,AAAA"));

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("should leave a failed background image empty when no placeholder is given", async ({
    createBackgroundNode,
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
    createBackgroundNode,
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

  test("should fetch and decode a background image shared by two elements only once", async ({
    createBackgroundNode,
  }) => {
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
