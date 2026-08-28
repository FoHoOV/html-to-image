import { Cache } from "@/cache";
import type { Options } from "@/types";
import type { PendingWork, WorkStatus } from "@/utils";
import { createWorkPromise, createWorkStatus } from "@/utils";

export type Context = {
  options: Options & { cache: Cache };
  embedding: {
    css: WorkStatus;
    image: WorkStatus;
    /**
     * Font work, plus the families the captured tree asks for. Families are
     * collected from every visited node, including nodes inside an iframe,
     * and are all resolved against the rendered root's own document.
     */
    font: WorkStatus & {
      usedFamilies: Set<string>;
      /**
       * The raw computed `font-family` values already parsed into
       * `usedFamilies`. Nodes inherit their font, so the same value arrives
       * many times over and only has to be parsed once.
       */
      parsedFontValues: Set<string>;
    };
  };
  cloning: PendingWork;
  addedToDom: PendingWork;
  renderedSize: { width: number; height: number } | null;
};

export function createContext(options?: Options) {
  return {
    options: { ...options, cache: options?.cache ?? new Cache() },
    embedding: {
      css: createWorkStatus(),
      image: createWorkStatus(),
      font: {
        ...createWorkStatus(),
        usedFamilies: new Set(),
        parsedFontValues: new Set(),
      },
    },
    cloning: createWorkPromise(),
    addedToDom: createWorkPromise(),
    renderedSize: null,
  } satisfies Context;
}
