/** Recently-viewed wallet addresses, persisted to localStorage. */
const RECENT_KEY = "whitehash.recent.v1"

export function loadRecent(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]") as string[]
  } catch {
    return []
  }
}

export function pushRecent(address: string): void {
  const list = [address, ...loadRecent().filter(a => a !== address)].slice(0, 8)
  localStorage.setItem(RECENT_KEY, JSON.stringify(list))
}
