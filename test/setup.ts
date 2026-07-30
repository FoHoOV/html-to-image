import { afterAll, beforeAll } from "vitest";

beforeAll(() => {
  window.devicePixelRatio = 1;
  window.history.replaceState(
    null,
    "",
    `/context.html${window.location.search}`,
  );
});

afterAll(() => {
  const rootId = "test-root";
  document.getElementById(rootId)?.remove();
});
