export interface HonoContextLike {
  req: { raw: Request }
}

export function toHono(handler: (request: Request) => Promise<Response>) {
  return (context: HonoContextLike): Promise<Response> => handler(context.req.raw)
}
