import { embed, parseURLs } from '../../src/node/utils/resources'

describe('embeding', () => {
  describe('parseURLs', () => {
    it('should parse urls', () => {
      expect(parseURLs('url("http://acme.com/file")')).toEqual([
        'http://acme.com/file',
      ])

      expect(parseURLs("url(foo.com), url('bar.org')")).toEqual([
        'foo.com',
        'bar.org',
      ])
    })

    it('should ignore data urls', () => {
      expect(parseURLs('url(foo.com), url(data:AAA)')).toEqual(['foo.com'])
    })
  })

  describe('embed', () => {
    it('should embed url', (done) => {
      embed(
        'url(http://acme.com/image.png), url(foo.com)',
        'http://acme.com/image.png',
        null,
        {},
        () => Promise.resolve('AAA'),
      )
        .then((result) => {
          expect(result).toEqual('url(data:image/png;base64,AAA), url(foo.com)')
        })
        .then(done)
        .catch(done)
    })

    it('should resolve urls if base url given', (done) => {
      embed(
        'url(images/image.png)',
        'images/image.png',
        'http://acme.com/',
        {},
        (url) =>
          Promise.resolve(
            (
              {
                'http://acme.com/images/image.png': 'AAA',
              } as any
            )[url],
          ),
      )
        .then((result) => {
          expect(result).toEqual('url(data:image/png;base64,AAA)')
        })
        .then(done)
        .catch(done)
    })
  })
})
