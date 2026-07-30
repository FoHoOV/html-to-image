import { isWebKit } from '../../src/utils/browser'

describe('browser engine detection', () => {
  test.each([
    {
      engine: 'desktop Safari',
      expected: true,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
        'Version/26.0 Safari/605.1.15',
    },
    {
      engine: 'iOS Chrome',
      expected: true,
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) ' +
        'AppleWebKit/605.1.15 (KHTML, like Gecko) ' +
        'CriOS/138.0.0.0 Mobile/15E148 Safari/604.1',
    },
    {
      engine: 'desktop Chrome',
      expected: false,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/134.0.0.0 Safari/537.36',
    },
    {
      engine: 'desktop Edge',
      expected: false,
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
        'AppleWebKit/537.36 (KHTML, like Gecko) ' +
        'Chrome/134.0.0.0 Safari/537.36 Edg/134.0.0.0',
    },
    {
      engine: 'desktop Firefox',
      expected: false,
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:138.0) ' +
        'Gecko/20100101 Firefox/138.0',
    },
  ])('detects $engine', ({ expected, userAgent }) => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'userAgent')
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: userAgent,
    })

    try {
      expect(isWebKit()).toBe(expected)
    } finally {
      restoreProperty(navigator, 'userAgent', descriptor)
    }
  })
})

function restoreProperty(
  target: object,
  property: PropertyKey,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    delete (target as Record<PropertyKey, unknown>)[property]
  }
}
