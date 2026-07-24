export function toNextRouteHandler(handler: (request: Request) => Promise<Response>): {
  GET(request: Request): Promise<Response>
  HEAD(request: Request): Promise<Response>
} {
  return { GET: handler, HEAD: handler }
}
