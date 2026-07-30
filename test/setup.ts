import { afterAll, beforeAll } from 'vitest'

const ROOT_ID = 'test-root'

beforeAll(() => {
  window.devicePixelRatio = 1
  window.history.replaceState(
    null,
    '',
    `/context.html${window.location.search}`,
  )
})

afterAll(() => {
  document.getElementById(ROOT_ID)?.remove()
})
