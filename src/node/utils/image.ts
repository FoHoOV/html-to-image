export function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      img
        .decode()
        .then(() => {
          requestAnimationFrame(() => resolve(img))
        })
        .catch(reject)
    }
    img.onerror = reject
    if (!url.startsWith('data:') && !url.startsWith('blob:')) {
      img.crossOrigin = 'anonymous'
    }
    img.decoding = 'sync'
    img.src = url
  })
}
