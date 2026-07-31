import { createWorkStatus } from "../../src/utils";

describe("work status", () => {
  test("resolves when sealed without work", async () => {
    const status = createWorkStatus();

    status.seal();

    await expect(status.ready).resolves.toBeUndefined();
  });

  test("waits for registered work", async () => {
    const status = createWorkStatus();
    let finishWork!: () => void;
    const work = new Promise<void>((resolve) => {
      finishWork = resolve;
    });
    let finished = false;

    status.add(() => work);
    status.seal();
    void status.ready.then(() => {
      finished = true;
    });
    await Promise.resolve();
    expect(finished).toBe(false);

    finishWork();
    await status.ready;
    expect(finished).toBe(true);
  });

  test("propagates registered work failures", async () => {
    const status = createWorkStatus();
    const error = new Error("work failed");

    status.add(() => Promise.reject(error));
    status.seal();

    await expect(status.ready).rejects.toBe(error);
  });
});
