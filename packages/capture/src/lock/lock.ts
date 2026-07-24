export interface CaptureLockLease {
  key: string
  token: string
}

export interface CaptureLock {
  acquire(key: string, ttlMs: number): Promise<CaptureLockLease | null>
  release(lease: CaptureLockLease): Promise<void>
}
