import { Options } from '@/types'
import { Cache, Resource } from '@/utils'

export type Context = {
  options: Options & { cache: Cache }
  queuedFetchRequests: Promise<Resource>[]
  queuedEmbedCalls: Promise<void>[]
}

export function createContext(options?: Options) {
  return {
    options: options?.cache
      ? // TODO: why this cast is required
        ({ ...options } as Context['options'])
      : { ...options, cache: new Cache() },
    queuedFetchRequests: [],
    queuedEmbedCalls: [],
  } satisfies Context
}
