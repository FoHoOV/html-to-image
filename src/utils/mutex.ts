export class Mutex {
  private _lock: Promise<void> = Promise.resolve()

  async acquire(): Promise<() => void> {
    const prev = this._lock

    let release: () => void
    const next = new Promise<void>((resolve) => {
      release = resolve
    })

    this._lock = this._lock.then(() => {
      return next
    })

    await prev

    return () => {
      release()
    }
  }

  wait() {
    return this._lock
  }
}
