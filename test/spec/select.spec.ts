import { toDataUrl } from "../../src";
import { test } from "../fixtures";

describe("work with select element", () => {
  ["first", "second", "third"].forEach((text) => {
    test(`should capture ${text} selected option`, async ({
      bootstrap,
      renderAndCheck,
    }) => {
      const node = await bootstrap(
        `forms/select/${text}-option.html`,
        "forms/select/style.css",
        `forms/select/reference-${text}`,
      );
      await renderAndCheck(node);
    });
  });

  test("should not mutate the source options' selected state", async () => {
    const select = document.createElement("select");
    const first = document.createElement("option");
    const second = document.createElement("option");
    first.value = "first";
    first.textContent = "first";
    first.setAttribute("selected", "");
    second.value = "second";
    second.textContent = "second";
    select.append(first, second);
    second.selected = true;

    // The rendered output reflecting the live selection (rather than the
    // stale `selected` attribute) is already covered visually above; this
    // asserts the source DOM survives untouched.
    await toDataUrl(select);

    expect(first.hasAttribute("selected")).toBe(true);
    expect(second.hasAttribute("selected")).toBe(false);
  });
});
