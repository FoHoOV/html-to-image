export function createWorkPool(limit: number) {
  const pending = new Set<Promise<void>>()
  let hasError = false
  let firstSeenError: unknown = null

  return {
    async add(promise: Promise<void>) {
      if (hasError) {
        throw firstSeenError
      }
      pending.add(promise)
      void promise
        .catch((error) => {
          if (!hasError) {
            hasError = true
            firstSeenError = error
          }
          throw error
        })
        .finally(() => {
          pending.delete(promise)
        })

      if (pending.size >= limit) {
        await Promise.race(pending)
      }
    },
    async drain() {
      if (hasError) {
        throw firstSeenError
      }
      await Promise.all(pending)
    },
  }
}
