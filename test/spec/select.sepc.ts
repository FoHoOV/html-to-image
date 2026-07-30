import { cloneNodeTree } from "../../src/node";
import { createContext } from "../../src/context";
import { test } from "../fixtures";

describe("work with select element", () => {
  ["first", "second", "third"].forEach((text) => {
    test(`should capture ${text} selected option`, async ({
      bootstrap,
      renderAndCheck,
    }) => {
      const node = await bootstrap(
        `select/${text}-option.html`,
        "select/style.css",
        `select/${text}`,
      );
      await renderAndCheck(node);
    });
  });

  test("should preserve live selection without mutating the source options", async () => {
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

    const clone = (await cloneNodeTree(
      select,
      createContext(),
    )) as HTMLSelectElement;
    const clonedOptions = Array.from(clone.options);

    expect(clonedOptions[0].hasAttribute("selected")).toBe(false);
    expect(clonedOptions[1].hasAttribute("selected")).toBe(true);
    expect(first.hasAttribute("selected")).toBe(true);
    expect(second.hasAttribute("selected")).toBe(false);
  });
});
