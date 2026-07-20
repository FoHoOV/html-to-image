import { isIOS } from './util'

type WindowWithSaveFilePicker = Window & {
  showSaveFilePicker?: unknown
}

function canShareImage() {
  if (
    typeof navigator.share !== 'function' ||
    typeof navigator.canShare !== 'function' ||
    typeof File !== 'function'
  ) {
    return false
  }

  try {
    return navigator.canShare({
      title: isIOS() ? undefined : '-',
      files: [
        new File([new Blob([], { type: 'image/png' })], '-', {
          type: 'image/png',
        }),
      ],
    })
  } catch {
    return false
  }
}

export function getApiAvailability() {
  const canShareText = typeof navigator.share === 'function'
  const canShareFile = canShareImage()
  const canSaveFile =
    typeof (window as WindowWithSaveFilePicker).showSaveFilePicker ===
    'function'

  return {
    canShareImage: canShareFile,
    canShareText,
    canSaveFile,
    canShare: canShareFile || canShareText || canSaveFile,
  }
}
