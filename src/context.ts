import type { Options } from "@/types";
import type { Resource } from "@/utils";
import { Cache } from "@/utils";

export type Context = {
  options: Options & { cache: Cache };
  inFlightRequests: Map<string, Promise<Resource>>;
};

export function createContext(options?: Options) {
  return {
    options: { ...options, cache: options?.cache ?? new Cache() },
    inFlightRequests: new Map(),
  } satisfies Context;
}
