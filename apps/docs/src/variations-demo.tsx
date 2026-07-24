"use client"

import { useMemo } from "react"
import type { WhitehashToken } from "@whitehash/chain-reader"
import { useWhitehash } from "@whitehash/react"
import {
  BlockchainType,
  createRuntimeConnector,
  type FxParamDefinition,
  type FxParamDefinitions,
  type FxParamType,
  type ProjectState,
} from "@whitehash/runtime"
import { ArtworkIframe, useRuntimeController } from "@whitehash/runtime/react"
import { Button, Field, Input } from "@whitehash/ui"
import { Callout } from "./components/docs-chrome"

function tokenRuntimeState(token: WhitehashToken): ProjectState {
  const metadata = token.raw && typeof token.raw === "object"
    ? token.raw as Record<string, unknown>
    : {}
  const artifact = token.artifactUri ?? ""
  const inputBytes = /(?:#0x|[?&]fxparams=)([0-9a-f]+)/i.exec(artifact)?.[1]
  const definition = (Array.isArray(metadata.params) ? metadata.params : undefined) as FxParamDefinitions | undefined
  const cid = token.generatorUri ?? artifact.replace(/[?#].*$/, "")
  return {
    cid,
    chain: token.chain.startsWith("tezos:")
      ? BlockchainType.TEZOS
      : token.chain === "eip155:8453" || token.chain === "eip155:84532"
        ? BlockchainType.BASE
        : BlockchainType.ETHEREUM,
    hash: token.iterationHash ?? undefined,
    iteration: token.tokenId,
    snippetVersion: typeof metadata.snippetVersion === "string" ? metadata.snippetVersion : undefined,
    inputBytes,
    definition,
  }
}

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

function freshHash(previous: string): string {
  if (previous.startsWith("0x")) {
    return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`
  }
  return `oo${Array.from({ length: 49 }, () => BASE58[Math.floor(Math.random() * BASE58.length)]!).join("")}`
}

function coerceParam(value: string, definition: FxParamDefinition<FxParamType>) {
  if (definition.type === "number") return Number(value)
  if (definition.type === "bigint") return BigInt(value)
  if (definition.type === "boolean") return value === "true"
  return value
}

export function Variations({ token }: { token: WhitehashToken }) {
  const { client } = useWhitehash()
  const state = useMemo(() => tokenRuntimeState(token), [token])
  const connector = useMemo(() => createRuntimeConnector({
    resolveUri: uri => client.resolveUri(uri, { chain: token.chain }),
  }), [client, token.chain])
  const value = useRuntimeController({ state, options: { connector, autoRefresh: true } })
  const definitions = value.runtime.definition.params ?? []
  const hash = value.runtime.state.hash ?? ""
  const supportsSeedVariation = Boolean(token.generatorUri)
  return <div className="mt-5 grid gap-8 md:grid-cols-[1.4fr_1fr]">
    <ArtworkIframe ref={value.ref} title={`Variation of ${token.name ?? token.tokenId}`} className="aspect-square w-full rounded-lg border border-line bg-black" />
    <div>
      <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">Explore variations</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Everything runs in your browser. Change the seed or declared fx(params); the controller rebuilds the content-addressed generator URL and reloads only this iframe.</p>
      <Field.Root className="mt-5"><Field.Label>Hash</Field.Label><Field.Control render={<Input value={hash} onChange={event => value.controller.runtime().updateState({ hash: event.target.value })} />} /></Field.Root>
      <Button className="mt-2" variant="secondary" disabled={!supportsSeedVariation} onClick={() => value.controller.runtime().updateState({ hash: freshHash(hash) })}>New hash</Button>
      {!supportsSeedVariation ? <Callout className="mt-4">This token record does not include its project’s reusable <code>generatorUri</code>. Its minted <code>artifactUri</code> may have the original seed embedded, so it is not safe to use as a variation generator.</Callout> : null}
      {definitions.length ? <div className="mt-6 space-y-4">{definitions.map(definition => <Field.Root key={definition.id}>
        <Field.Label>{definition.name ?? definition.id}</Field.Label>
        <Field.Control render={<Input defaultValue={String(value.controls.params.values[definition.id] ?? definition.value ?? definition.default)} onChange={event => value.controller.controls().update({ [definition.id]: coerceParam(event.target.value, definition) }, definitions, { forceRefresh: true })} />} />
      </Field.Root>)}</div> : <Callout className="mt-6">This token does not publish editable fx(params) definitions. Seed exploration is still available.</Callout>}
      <p className="mt-5 break-all font-mono text-[11px] text-faint">{value.controller.getUrl()}</p>
    </div>
  </div>
}
