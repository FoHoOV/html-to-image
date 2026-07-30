import { createContext } from "../../src/context";
import { embed, parseURLs } from "../../src/node/utils/resources";
import { test } from "../fixtures";

describe("embeding", () => {
  describe("parseURLs", () => {
    test("should parse urls", () => {
      expect(parseURLs('url("http://acme.com/file")')).toEqual([
        "http://acme.com/file",
      ]);

      expect(parseURLs("url(foo.com), url('bar.org')")).toEqual([
        "foo.com",
        "bar.org",
      ]);
    });

    test("should ignore data urls", () => {
      expect(parseURLs("url(foo.com), url(data:AAA)")).toEqual(["foo.com"]);
    });
  });

  describe("embed", () => {
    test("should embed url", async () => {
      const result = await embed(
        "url(http://acme.com/image.png), url(foo.com)",
        "http://acme.com/image.png",
        null,
        createContext(),
        () => Promise.resolve("AAA"),
      );

      expect(result).toEqual("url(data:image/png;base64,AAA), url(foo.com)");
    });

    test("should resolve urls if base url given", async () => {
      const result = await embed(
        "url(images/image.png)",
        "images/image.png",
        "http://acme.com/",
        createContext(),
        (url) =>
          Promise.resolve(
            (
              {
                "http://acme.com/images/image.png": "AAA",
              } as any
            )[url],
          ),
      );

      expect(result).toEqual("url(data:image/png;base64,AAA)");
    });
  });
});
