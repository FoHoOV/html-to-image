import { clean } from './helper'

beforeAll(() => {
  window.devicePixelRatio = 1
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 20000
})

afterAll(() => {
  clean()
})
