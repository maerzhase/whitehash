declare module "gifenc" {
  export interface GifEncoder {
    writeFrame(
      indexedPixels: Uint8Array,
      width: number,
      height: number,
      options: {
        palette: number[][]
        delay?: number
        repeat?: number
        transparent?: boolean
        transparentIndex?: number
        dispose?: number
      },
    ): void
    finish(): void
    bytes(): Uint8Array
  }

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GifEncoder
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: Record<string, unknown>,
  ): number[][]
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: number[][],
    format?: "rgb444" | "rgb565",
  ): Uint8Array
}
