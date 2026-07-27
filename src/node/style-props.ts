import { Options } from '@/types'

let styleProps: string[] | null = null
export function getStyleProperties(options: Options = {}): string[] {
  if (options.includeStyleProperties) {
    styleProps = options.includeStyleProperties
    return styleProps
  }

  if (!styleProps) {
    styleProps = Array.from(window.getComputedStyle(document.documentElement))
  }

  return styleProps
}
