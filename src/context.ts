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
     * Font work, plus the families each source document is asked to supply.
     * Families are keyed by the original `ownerDocument`: an iframe body is
     * adopted into the output document when cloned, so the clone's document
     * cannot say which stylesheets may define the family.
     */
    font: WorkStatus & {
      usedFamiliesByDocument: Map<
        Document,
        {
          families: Set<string>;
          /**
           * The raw computed `font-family` values already parsed into
           * `families`. Nodes inherit their font, so the same value arrives
           * many times over and only has to be parsed once.
           */
          parsedValues: Set<string>;
        }
      >;
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
      font: { ...createWorkStatus(), usedFamiliesByDocument: new Map() },
    },
    cloning: createWorkPromise(),
    addedToDom: createWorkPromise(),
    renderedSize: null,
  } satisfies Context;
}
