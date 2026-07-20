import { getApiAvailability } from '../../src'

describe('browser API availability', () => {
  it('detects native sharing and file saving support', () => {
    const shareDescriptor = Object.getOwnPropertyDescriptor(navigator, 'share')
    const canShareDescriptor = Object.getOwnPropertyDescriptor(
      navigator,
      'canShare',
    )
    const saveDescriptor = Object.getOwnPropertyDescriptor(
      window,
      'showSaveFilePicker',
    )

    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => Promise.resolve(),
    })
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    })
    Object.defineProperty(window, 'showSaveFilePicker', {
      configurable: true,
      value: () => Promise.resolve(),
    })

    try {
      expect(getApiAvailability()).toEqual({
        canShareImage: true,
        canShareText: true,
        canSaveFile: true,
        canShare: true,
      })
    } finally {
      restoreProperty(navigator, 'share', shareDescriptor)
      restoreProperty(navigator, 'canShare', canShareDescriptor)
      restoreProperty(window, 'showSaveFilePicker', saveDescriptor)
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
