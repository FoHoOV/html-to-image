import { expect, test } from "vitest";
import { createWorkPool } from "../../src/utils";

test("work pool propagates a rejection without an unhandled observer rejection", async () => {
  const error = new Error("work failed");
  const unhandledReasons: unknown[] = [];
  const onUnhandledRejection = (event: PromiseRejectionEvent) => {
    event.preventDefault();
    unhandledReasons.push(event.reason);
  };
  window.addEventListener("unhandledrejection", onUnhandledRejection);

  try {
    const pool = createWorkPool(2);
    await pool.add(Promise.reject(error));

    await expect(pool.drain()).rejects.toBe(error);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(unhandledReasons).toEqual([]);
  } finally {
    window.removeEventListener("unhandledrejection", onUnhandledRejection);
  }
});
