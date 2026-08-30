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

  test("should render the live selection over a stale selected attribute", async ({
    bootstrap,
    renderAndCheck,
  }) => {
    const node = await bootstrap(
      "forms/select/first-option.html",
      "forms/select/style.css",
      "forms/select/reference-second",
    );
    const select = node.querySelector("select") as HTMLSelectElement;

    // The markup's `selected` attribute is still on "first"; only the live
    // `.selected` property below reflects "second". The rendered output must
    // match second-option.html's reference, not the stale-attribute markup.
    select.options[1].selected = true;

    await renderAndCheck(node);
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

    await toDataUrl(select);

    expect(first.hasAttribute("selected")).toBe(true);
    expect(second.hasAttribute("selected")).toBe(false);
  });
});
