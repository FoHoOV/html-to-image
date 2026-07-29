import { Options } from '@/types'

let styleProps: string[] | null = null
export function getStyleProperties(options: Options = {}): string[] {
  if (options.includeStyleProperties) {
    return options.includeStyleProperties
  }

  if (!styleProps) {
    styleProps = Array.from(window.getComputedStyle(document.documentElement))
  }

  return styleProps
}

export function applyStyle<TElement extends HTMLElement>(
  node: TElement,
  options: Options,
) {
  if (options.width) {
    node.style.width = `${options.width}px`
  }

  if (options.height) {
    node.style.height = `${options.height}px`
  }

  const manual = options.style
  if (manual != null) {
    Object.keys(manual).forEach((key: any) => {
      node.style[key] = `${manual[key]} !important` as string
    })
  }
}
