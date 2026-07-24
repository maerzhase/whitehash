/** Shared least-privilege defaults for rendering untrusted artwork. */
export const ARTWORK_IFRAME_SANDBOX =
  "allow-scripts allow-same-origin allow-modals"

export const ARTWORK_IFRAME_ALLOW = [
  "accelerometer *",
  "camera *",
  "gyroscope *",
  "microphone *",
  "xr-spatial-tracking *",
  "fullscreen *",
].join("; ")
