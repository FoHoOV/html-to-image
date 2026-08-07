import type { Options } from "@/types";
import type { PendingWork, Resource, WorkStatus } from "@/utils";
import { Cache, createWorkPromise, createWorkStatus } from "@/utils";

export type Context = {
  options: Options & { cache: Cache };
  inFlightRequests: Map<string, Promise<Resource>>;
  embedding: {
    css: WorkStatus;
    image: WorkStatus;
    font: WorkStatus & {
      documentToFonts: Map<
        Document,
        { status: PendingWork; data: Array<{ family: string; weight: string }> }
      >;
    };
  };
  addedToDom: PendingWork;
  renderedSize: { width: number; height: number } | null;
};

export function createContext(options?: Options) {
  return {
    options: { ...options, cache: options?.cache ?? new Cache() },
    inFlightRequests: new Map(),
    embedding: {
      css: createWorkStatus(),
      image: createWorkStatus(),
      font: { documentToFonts: new Map(), ...createWorkStatus() },
    },
    addedToDom: createWorkPromise(),
    renderedSize: null,
  } satisfies Context;
}
