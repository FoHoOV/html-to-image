import { Options } from '@/types'
import { Cache, Resource } from '@/utils'

export type Context = {
  options: Options & { cache: Cache }
  inFlightRequests: Map<string, Promise<Resource>>
}

export function createContext(options?: Options) {
  return {
    options: { ...options, cache: options?.cache ?? new Cache() },
    inFlightRequests: new Map(),
  } satisfies Context
}
