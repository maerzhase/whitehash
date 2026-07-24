export interface StoredCapture {
  body: Uint8Array
  mimeType: string
  metadata?: Record<string, string>
}

export interface CaptureStore {
  head(key: string): Promise<boolean>
  get(key: string): Promise<StoredCapture | null>
  put(key: string, value: StoredCapture): Promise<void>
  publicUrl?(key: string): string | Promise<string>
}
