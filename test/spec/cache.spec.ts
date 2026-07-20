import { Cache } from '../../src'
import { fetchResource } from '../../src/fetch'

describe('resource cache', () => {
  it('reuses a cached response across output formats', async () => {
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

    const second = await fetchResource('/asset.txt?version=2', undefined, {
      cache,
    })
    expect(await second.asDataUrl()).toContain('data:text/plain;base64,')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('keeps query parameters in cache keys when requested', async () => {
    const fetchSpy = spyOn(window, 'fetch').and.callFake(async (input) =>
      Promise.resolve(new Response(String(input))),
    )
    const cache = new Cache()
    const options = { cache, includeQueryParams: true }

    await fetchResource('/asset.txt?version=1', undefined, options)
    await fetchResource('/asset.txt?version=2', undefined, options)

    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })
})
