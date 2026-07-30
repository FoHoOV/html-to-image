import { Options } from '@/types'
import { Cache, Resource } from '@/utils'

export type Context = {
  options: Options & { cache: Cache }
  queuedFetchRequests: Map<string, Promise<Resource>>
}

export function createContext(options?: Options) {
  return {
    options: options?.cache
      ? // TODO: why this cast is required
        ({ ...options } as Context['options'])
      : { ...options, cache: new Cache() },
    queuedFetchRequests: new Map(),
  } satisfies Context
}
