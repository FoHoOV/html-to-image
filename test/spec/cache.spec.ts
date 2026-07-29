import { Cache } from '../../src'
import { fetchResource } from '../../src/utils'

describe('resource cache', () => {
  it('does not retain resources unless a cache is provided', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(
        new Response(String(input), {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )

    const first = await fetchResource('/uncached.txt', undefined, {})
    first.asString()
    const second = await fetchResource('/uncached.txt', undefined, {})
    second.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('shares simultaneous uncached requests and releases them afterward', async () => {
    let resolveFetch!: (response: Response) => void
    const fetchSpy = spyOn(window, 'fetch').and.callFake(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve
        }),
    )

    const firstPromise = fetchResource('/concurrent.txt', undefined, {})
    const secondPromise = fetchResource('/concurrent.txt', undefined, {})

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    resolveFetch(new Response('shared response'))

    const [first, second] = await Promise.all([firstPromise, secondPromise])
    expect(first.asString()).toBe('shared response')
    expect(second.asString()).toBe('shared response')

    const thirdPromise = fetchResource('/concurrent.txt', undefined, {})
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    resolveFetch(new Response('new response'))
    expect((await thirdPromise).asString()).toBe('new response')
  })

  it('releases failed requests so they can be retried', async () => {
    let requestCount = 0
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async () => {
      requestCount += 1
      return requestCount === 1
        ? new Response('', { status: 500, statusText: 'Failed' })
        : new Response('retry response')
    })

    const firstPromise = fetchResource('/retry.txt', undefined, {})
    const secondPromise = fetchResource('/retry.txt', undefined, {})

    await Promise.all([
      expectAsync(firstPromise).toBeRejectedWithError(/cannot fetch/),
      expectAsync(secondPromise).toBeRejectedWithError(/cannot fetch/),
    ])
    expect(fetchSpy).toHaveBeenCalledTimes(1)

    const retry = await fetchResource('/retry.txt', undefined, {})
    expect(retry.asString()).toBe('retry response')
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('stores a shared request in each caller cache', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async () =>
      Promise.resolve(new Response('shared response')),
    )
    const firstCache = new Cache()
    const secondCache = new Cache()

    const [first, second] = await Promise.all([
      fetchResource('/shared.txt', undefined, { cache: firstCache }),
      fetchResource('/shared.txt', undefined, { cache: secondCache }),
    ])
    expect(first.asString()).toBe('shared response')
    expect(second.asString()).toBe('shared response')

    await fetchResource('/shared.txt', undefined, { cache: firstCache })
    await fetchResource('/shared.txt', undefined, { cache: secondCache })
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('reuses a cached string response', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(
        new Response(String(input), {
          headers: { 'Content-Type': 'text/plain' },
        }),
      ),
    )
    const cache = new Cache()

    const first = await fetchResource('/asset.txt?version=1', undefined, {
      cache,
    })
    expect(first.asString()).toContain('version=1')

    const second = await fetchResource('/asset.txt?version=1', undefined, {
      cache,
    })
    expect(second.asString()).toContain('version=1')

    const third = await fetchResource('/asset.txt?version=1', undefined, {
      cache,
    })
    expect(third.asString()).toContain('version=1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('includes query parameters in cache keys by default', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()
    const options = { cache }

    const first = await fetchResource(
      '/asset.txt?version=1',
      undefined,
      options,
    )
    first.asString()
    const second = await fetchResource(
      '/asset.txt?version=2',
      undefined,
      options,
    )
    second.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('strips query parameters from cache keys when disabled', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()
    const options = { cache, includeQueryParams: false }

    const first = await fetchResource(
      '/asset.txt?version=1',
      undefined,
      options,
    )
    expect(first.asString()).toContain('version=1')

    const second = await fetchResource(
      '/asset.txt?version=2',
      undefined,
      options,
    )
    expect(second.asString()).toContain('version=1')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('bypasses cache reads and writes when cache busting', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()

    const cached = await fetchResource('/asset.txt', undefined, { cache })
    cached.asString()
    const busted = await fetchResource('/asset.txt', undefined, {
      cache,
      cacheBust: true,
      includeQueryParams: false,
    })
    busted.asString()
    const reused = await fetchResource('/asset.txt', undefined, { cache })
    reused.asString()

    expect(fetchSpy).toHaveBeenCalledTimes(2)
    expect(fetchSpy.calls.argsFor(1)[0]).toMatch(/^\/asset\.txt\?\d+$/)
  })
})
