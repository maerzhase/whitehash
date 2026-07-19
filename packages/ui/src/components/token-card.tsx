import { createContext, useContext, type ComponentProps, type ReactNode } from "react"
import { imageSourceUri, tokenKey, type WhitehashToken } from "@whitehash/chain-reader"
import { useGatewayImage } from "@whitehash/react"
import { Badge } from "./badge.js"
import { Button, type ButtonProps } from "./button.js"
import { Card } from "./card.js"
import { Skeleton } from "./feedback.js"
import { cn } from "../lib/cn.js"

function chainLabel(chain: string): string {
  if (chain.startsWith("tezos")) return chain.includes("ghost") ? "Ghostnet" : "Tezos"
  if (chain === "eip155:1") return "Ethereum"
  if (chain === "eip155:8453") return "Base"
  if (chain === "eip155:11155111") return "Sepolia"
  if (chain === "eip155:84532") return "Base Sepolia"
  return chain
}

const TokenCardContext = createContext<WhitehashToken | null>(null)

function useTokenCard(): WhitehashToken {
  const token = useContext(TokenCardContext)
  if (!token) throw new Error("TokenCard parts must be rendered inside TokenCard.Root")
  return token
}

export interface TokenCardProps {
  token: WhitehashToken
  onSelect?: (token: WhitehashToken) => void
  render?: ButtonProps["render"]
  className?: string
  children?: ReactNode
  id?: string
  "aria-label"?: string
}

function Root({ token, onSelect, render, className, children, ...props }: TokenCardProps) {
  const content = children ?? (
    <>
      <Media />
      <Card.Body>
        <Title />
        <Meta />
      </Card.Body>
    </>
  )
  return (
    <TokenCardContext.Provider value={token}>
      {onSelect ? (
        <Button
          variant="card"
          render={render}
          className={className}
          onClick={() => onSelect(token)}
          {...props}
        >
          {content}
        </Button>
      ) : (
        <Card.Root className={className} {...props}>{content}</Card.Root>
      )}
    </TokenCardContext.Provider>
  )
}

export interface TokenCardMediaProps extends ComponentProps<typeof Card.Media> {
  imageClassName?: string
}

function Media({ className, imageClassName, children, ...props }: TokenCardMediaProps) {
  const token = useTokenCard()
  const image = useGatewayImage(imageSourceUri(token, "thumbnail"), token.chain)
  return (
    <Card.Media className={cn("bg-canvas", className)} {...props}>
      {children ?? (
        <div className="absolute inset-3">
          {image.failed || !image.src ? (
            <div className={cn("hatch size-full", imageClassName)} aria-hidden />
          ) : (
            <img
              src={image.src}
              onError={image.onError}
              alt={token.name ?? ""}
              loading="lazy"
              className={cn("block size-full object-contain", imageClassName)}
            />
          )}
        </div>
      )}
      {!token.assigned ? (
        <Badge variant="warning" className="absolute left-2 top-2 bg-black/60">
          unrevealed
        </Badge>
      ) : null}
    </Card.Media>
  )
}

function Title({ children, ...props }: ComponentProps<typeof Card.Title>) {
  const token = useTokenCard()
  return <Card.Title {...props}>{children ?? token.name ?? `#${token.tokenId}`}</Card.Title>
}

function Meta({ children, ...props }: ComponentProps<typeof Card.Meta>) {
  const token = useTokenCard()
  return (
    <Card.Meta {...props}>
      {children ?? <Badge>{chainLabel(token.chain)}</Badge>}
    </Card.Meta>
  )
}

export interface TokenGridProps extends ComponentProps<"div"> {
  tokens: WhitehashToken[]
  onOpen?: (token: WhitehashToken) => void
  empty?: ReactNode
}

export function TokenGrid({ tokens, onOpen, empty = null, className, ...props }: TokenGridProps) {
  if (tokens.length === 0) return <>{empty}</>
  return (
    <div
      className={cn("mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6", className)}
      {...props}
    >
      {tokens.map(token => (
        <Root key={tokenKey(token)} token={token} onSelect={onOpen} />
      ))}
    </div>
  )
}

export function TokenGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div
      className={cn("mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-6", className)}
      aria-hidden
    >
      {Array.from({ length: count }, (_, index) => (
        <Card.Root key={index} className="shadow-[0_1px_2px_rgba(0,0,0,.16)]">
          <Card.Media className="bg-canvas"><Skeleton className="absolute inset-5" /></Card.Media>
          <Card.Body>
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-16" />
          </Card.Body>
        </Card.Root>
      ))}
    </div>
  )
}

export const TokenCard = Object.assign(Root, { Root, Media, Title, Meta })
