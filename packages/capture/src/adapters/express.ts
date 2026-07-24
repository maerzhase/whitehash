export interface ExpressRequestLike {
  method: string
  originalUrl?: string
  url: string
  protocol?: string
  headers: Record<string, string | string[] | undefined>
  get?(name: string): string | undefined
}

export interface ExpressResponseLike {
  status(code: number): ExpressResponseLike
  setHeader(name: string, value: string): void
  send(body?: Uint8Array): void
}

export interface ExpressNextLike {
  (error?: unknown): void
}

export function toExpress(handler: (request: Request) => Promise<Response>) {
  return async (
    request: ExpressRequestLike,
    response: ExpressResponseLike,
    next: ExpressNextLike,
  ): Promise<void> => {
    try {
      const protocol = request.protocol ?? "http"
      const host = request.get?.("host") ?? String(request.headers.host ?? "localhost")
      const headers = new Headers()
      for (const [name, value] of Object.entries(request.headers)) {
        if (value != null) headers.set(name, Array.isArray(value) ? value.join(", ") : value)
      }
      const webResponse = await handler(
        new Request(`${protocol}://${host}${request.originalUrl ?? request.url}`, {
          method: request.method,
          headers,
        }),
      )
      response.status(webResponse.status)
      webResponse.headers.forEach((value, name) => {
        response.setHeader(name, value)
      })
      response.send(
        request.method === "HEAD" ? undefined : new Uint8Array(await webResponse.arrayBuffer()),
      )
    } catch (error) {
      next(error)
    }
  }
}
