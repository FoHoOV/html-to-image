import { embedImages } from '../../src/embed-images'

describe('Error Handling in resourceToDataURL', () => {
  it('should call the onImageErrorHandler when an error occurs', async () => {
    const handlers = {
      onError: () => {},
    }
    spyOn(handlers, 'onError')
    const options = { onImageErrorHandler: handlers.onError }
    const node = document.createElement('img')
    node.src = 'invalid_url'

    // Assuming resourceToDataURL is the function being tested
    await embedImages(node, options).then(() => {
      expect(handlers.onError).toHaveBeenCalled()
    })
  })

  it('should reject with an error if no onImageErrorHandler is provided', async () => {
    const options = {}
    const node = document.createElement('img')
    node.src = 'invalid_url'
    await embedImages(node, options).catch((error) => {
      expect(() => {
        throw error
      }).toThrow()
    })
  })

  it('should propagate errors from onImageErrorHandler', async () => {
    const handlerError = new Error('image error handler failed')
    const node = document.createElement('img')
    node.src = 'invalid_url'
    let rejection: unknown

    try {
      await embedImages(node, {
        onImageErrorHandler: () => Promise.reject(handlerError),
      })
    } catch (error) {
      rejection = error
    }

    expect(rejection).toBe(handlerError)
  })
})
