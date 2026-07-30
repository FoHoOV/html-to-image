import { Options } from '@/types'

const WEBKIT_ENGINE = /AppleWebKit\/[\d.]+/
const BLINK_ENGINE = /(?:Chrome|Chromium|Edg|OPR)\/[\d.]+/

export function isWebKit() {
  // UA detection is intentional: there is no feature flag for this WebKit
  // rendering bug, and Blink UAs also include the AppleWebKit token.
  const userAgent = navigator.userAgent

  return WEBKIT_ENGINE.test(userAgent) && !BLINK_ENGINE.test(userAgent)
}

export function addHiddenDomElement(originalNode: Node, clonedNode: Node) {
  const hiddenNode = document.createElement('div')
  hiddenNode.style.position = 'fixed'
  hiddenNode.style.zIndex = '-100000'
  hiddenNode.style.opacity = '0'
  hiddenNode.style.top = '0'
  hiddenNode.style.left = '-200%'

  hiddenNode.appendChild(clonedNode)

  const parent = originalNode.parentNode ?? document.body
  parent.insertBefore(hiddenNode, parent.firstChild)

  return () => {
    hiddenNode.remove()
  }
}

export async function nextFrame() {
  await new Promise((resolve) => {
    requestAnimationFrame(resolve)
  })
  // Some WebKit versions run the first callback before style and paint work.
  await new Promise((resolve) => {
    requestAnimationFrame(resolve)
  })
}

export function canvasToBlob(
  canvas: HTMLCanvasElement,
  options: Options = {},
): Promise<Blob | null> {
  if (canvas.toBlob) {
    return new Promise((resolve) => {
      canvas.toBlob(resolve, options.type ?? 'image/png', options.quality ?? 1)
    })
  }

  return new Promise((resolve) => {
    const binaryString = window.atob(
      canvas.toDataURL(options.type, options.quality).split(',')[1],
    )
    const len = binaryString.length
    const binaryArray = new Uint8Array(len)

    for (let i = 0; i < len; i += 1) {
      binaryArray[i] = binaryString.charCodeAt(i)
    }

    resolve(
      new Blob([binaryArray], {
        type: options.type ? options.type : 'image/png',
      }),
    )
  })
}
