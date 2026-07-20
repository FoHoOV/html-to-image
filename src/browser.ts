import { isIOS } from './util'

type WindowWithSaveFilePicker = Window & {
  showSaveFilePicker?: unknown
}

function isShareSupported() {
  return typeof navigator.share === 'function'
}

function canShare(data: ShareData) {
  if (!isShareSupported()) {
    return false
  }

  return navigator.canShare(data)
}

export function getApiAvailability() {
  const canShareText = isShareSupported()
  const canShareFile = canShare({
    title: isIOS() ? undefined : '-',
    files: [
      new File([new Blob(undefined, { type: 'image/png' })], '-', {
        type: 'image/png',
      }),
    ],
  })
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
