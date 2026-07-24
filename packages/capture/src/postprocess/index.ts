export interface ThumbnailOptions {
  size?: number
}

export async function makeThumbnail(
  image: Uint8Array,
  options: ThumbnailOptions = {},
): Promise<Buffer> {
  const { default: sharp } = await import("sharp")
  const size = options.size ?? 300
  return sharp(image).resize(size, size, { fit: "inside" }).png().toBuffer()
}

export async function gifMiddleFrameStill(
  gif: Uint8Array,
): Promise<{ image: Buffer; thumbnail: Buffer }> {
  const { default: sharp } = await import("sharp")
  const metadata = await sharp(gif, { animated: true }).metadata()
  const page = Math.floor(((metadata.pages ?? 1) - 1) / 2)
  const image = await sharp(gif, { page }).png().toBuffer()
  return { image, thumbnail: await makeThumbnail(image) }
}
