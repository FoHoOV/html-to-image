import { toPng } from '../../src'
import { test } from '../fixtures'

describe('special cases', () => {
  test.skip('should not crash when loading external stylesheet causes error', async ({
    bootstrap,
    delay,
  }) => {
    const node = await bootstrap('ext-css/node.html', 'ext-css/style.css')
    await delay(1000)
    await toPng(node)
  })

  test.skip('should render content from shadow node of custom element', async ({
    bootstrap,
    delay,
    renderAndCheck,
  }) => {
    const link = document.createElement('link')
    const script = document.createElement('script')
    script.src = 'https://unpkg.com/mathlive/dist/mathlive.min.js'
    link.rel = 'stylesheet'
    link.crossOrigin = 'anonymous'
    link.href = 'https://unpkg.com/mathlive/dist/mathlive-fonts.css'
    const tasks = [
      new Promise((resolve, reject) => {
        script.onload = resolve
        script.onerror = reject
      }),
      new Promise((resolve, reject) => {
        link.onload = resolve
        link.onerror = reject
      }),
    ]
    document.head.append(script, link)

    await Promise.all(tasks)
    const node = await bootstrap(
      'custom-element/node.html',
      'custom-element/style.css',
      'custom-element/image',
    )
    await delay(1000)
    await renderAndCheck(node)

    link.remove()
    script.remove()
  })

  test('should caputre lazy loading images', async ({
    assertTextRendered,
    bootstrap,
  }) => {
    const node = await bootstrap('images/loading.html', 'images/style.css')
    await assertTextRendered(['PNG', 'JPG'], node)
  })
})
