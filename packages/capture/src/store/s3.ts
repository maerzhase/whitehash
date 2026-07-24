import {
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  type S3Client,
} from "@aws-sdk/client-s3"
import type { CaptureStore } from "./store.js"

export interface S3StoreOptions {
  client: S3Client
  bucket: string
  prefix?: string
  publicBaseUrl?: string
}

export function s3Store(options: S3StoreOptions): CaptureStore {
  const objectKey = (key: string) =>
    `${options.prefix?.replace(/^\/|\/$/g, "") ?? ""}${options.prefix ? "/" : ""}${key}`
  return {
    async head(key) {
      try {
        await options.client.send(
          new HeadObjectCommand({ Bucket: options.bucket, Key: objectKey(key) }),
        )
        return true
      } catch {
        return false
      }
    },
    async get(key) {
      try {
        const result = await options.client.send(
          new GetObjectCommand({ Bucket: options.bucket, Key: objectKey(key) }),
        )
        if (!result.Body) return null
        return {
          body: await result.Body.transformToByteArray(),
          mimeType: result.ContentType ?? "application/octet-stream",
          metadata: result.Metadata,
        }
      } catch {
        return null
      }
    },
    async put(key, value) {
      await options.client.send(
        new PutObjectCommand({
          Bucket: options.bucket,
          Key: objectKey(key),
          Body: value.body,
          ContentType: value.mimeType,
          Metadata: value.metadata,
        }),
      )
    },
    publicUrl: options.publicBaseUrl
      ? key => `${options.publicBaseUrl!.replace(/\/+$/, "")}/${objectKey(key)}`
      : undefined,
  }
}
