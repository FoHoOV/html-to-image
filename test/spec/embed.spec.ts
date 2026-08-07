import { createContext } from "../../src/context";
import { getEmbeddableResource } from "../../src/node/utils";
import { test } from "../fixtures";

const PNG_RESPONSE = () =>
  new Response("A", { headers: { "Content-Type": "image/png" } });
const PNG_DATA_URL = "url(data:image/png;base64,QQ==)";

describe("embeding", () => {
  describe("url replacement", () => {
    test("should replace quoted and unquoted urls", async () => {
      vi.spyOn(window, "fetch").mockImplementation(async () => PNG_RESPONSE());

      const { cssText } = await getEmbeddableResource(
        `url("http://acme.com/file"), url(foo.com), url('bar.org')`,
        undefined,
        undefined,
        createContext(),
      );

      expect(cssText).toBe(
        `url("data:image/png;base64,QQ=="), ${PNG_DATA_URL}, url('data:image/png;base64,QQ==')`,
      );
    });

    test("should ignore data urls", async () => {
      const fetchSpy = vi
        .spyOn(window, "fetch")
        .mockImplementation(async () => PNG_RESPONSE());

      const { cssText } = await getEmbeddableResource(
        "url(foo.com), url(data:AAA)",
        undefined,
        undefined,
        createContext(),
      );

      expect(cssText).toBe(`${PNG_DATA_URL}, url(data:AAA)`);
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    test("should resolve urls if base url given", async () => {
      const fetchSpy = vi
        .spyOn(window, "fetch")
        .mockImplementation(async () => PNG_RESPONSE());

      const { cssText } = await getEmbeddableResource(
        "url(images/image.png)",
        "http://acme.com/",
        undefined,
        createContext(),
      );

      expect(cssText).toBe(PNG_DATA_URL);
      expect(fetchSpy).toHaveBeenCalledWith(
        "http://acme.com/images/image.png",
        undefined,
      );
    });

    test("should embed a short url without replacing the function name", async () => {
      vi.spyOn(window, "fetch").mockResolvedValue(PNG_RESPONSE());

      const { cssText } = await getEmbeddableResource(
        "url(u)",
        undefined,
        undefined,
        createContext(),
      );

      expect(cssText).toBe(PNG_DATA_URL);
    });
  });

  describe("failures", () => {
    test("should report a failure when no placeholder is given", async () => {
      vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));

      const result = await getEmbeddableResource(
        "url(http://acme.com/image.png)",
        undefined,
        undefined,
        createContext(),
      );

      expect(result.failed).toBe(true);
      expect(result.cssText).toBe("url()");
    });

    test("should substitute a placeholder instead of failing", async () => {
      vi.spyOn(window, "fetch").mockRejectedValue(new Error("offline"));

      const result = await getEmbeddableResource(
        "url(http://acme.com/image.png)",
        undefined,
        "data:image/png;base64,placeholder",
        createContext(),
      );

      expect(result.failed).toBe(false);
      expect(result.cssText).toBe("url(data:image/png;base64,placeholder)");
    });
  });

  test("should share concurrent data url conversion work", async () => {
    const fetchSpy = vi
      .spyOn(window, "fetch")
      .mockResolvedValue(PNG_RESPONSE());
    const readSpy = vi.spyOn(FileReader.prototype, "readAsDataURL");
    const context = createContext();

    const results = await Promise.all([
      getEmbeddableResource("url(shared.png)", undefined, undefined, context),
      getEmbeddableResource("url(shared.png)", undefined, undefined, context),
    ]);

    expect(results.map((result) => result.cssText)).toEqual([
      PNG_DATA_URL,
      PNG_DATA_URL,
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(readSpy).toHaveBeenCalledTimes(1);
  });
});
