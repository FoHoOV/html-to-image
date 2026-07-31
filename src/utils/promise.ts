export type PendingWork = {
  markAsReady: () => void;
  ready: Promise<void>;
};

export type WorkStatus = {
  add: (work: () => void | Promise<void>) => void;
  seal: () => void;
  ready: Promise<void>;
};

export function createWorkPromise() {
  let markAsReady!: () => void;
  const promise = new Promise<void>((resolve) => {
    markAsReady = resolve;
  });

  return {
    markAsReady,
    ready: promise,
  } satisfies PendingWork;
}

export function createWorkStatus(): WorkStatus {
  let pending = 0;
  let sealed = false;
  let hasError = false;
  let firstError: unknown;
  let markAsReady!: () => void;
  let markAsFailed!: (error: unknown) => void;

  const ready = new Promise<void>((resolve, reject) => {
    markAsReady = resolve;
    markAsFailed = reject;
  });

  function finishWork(failed: boolean, error?: unknown) {
    if (failed && !hasError) {
      hasError = true;
      firstError = error;
    }

    pending -= 1;
    settleIfFinished();
  }

  function settleIfFinished() {
    if (!sealed || pending > 0) {
      return;
    }

    if (hasError) {
      markAsFailed(firstError);
    } else {
      markAsReady();
    }
  }

  return {
    add(work) {
      if (sealed) {
        throw new Error("Cannot add work after the status has been sealed");
      }

      pending += 1;
      void Promise.resolve()
        .then(work)
        .then(
          () => finishWork(false),
          (error) => finishWork(true, error),
        );
    },
    seal() {
      sealed = true;
      settleIfFinished();
    },
    ready,
  };
}
