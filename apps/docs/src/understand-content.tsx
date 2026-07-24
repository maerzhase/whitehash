"use client"

import { useWhitehash } from "@whitehash/react"
import { Badge, Input } from "@whitehash/ui"
import Link from "next/link"
import { useState } from "react"
import { Callout, CodeBlock, DocsHeading, DocsPage, DocsSection } from "./components/docs-chrome"

/**
 * The "Understand" section — the transparency layer. Every fact whitehash
 * surfaces is traced here to its on-chain or content-addressed source, in one
 * consistent vocabulary. These pages answer, one click from the docs home:
 * where the image URL comes from, where the contract addresses come from, and
 * what separates a project from a token.
 */

export interface UnderstandEntry {
  slug: string
  title: string
  description: string
}

export const UNDERSTAND_ENTRIES: UnderstandEntry[] = [
  {
    slug: "overview",
    title: "How Whitehash works",
    description: "The three ideas you need before using the guides and API reference.",
  },
  {
    slug: "data-model",
    title: "Projects and tokens",
    description: "A project is the generator; a token is one minted iteration.",
  },
  {
    slug: "sources",
    title: "Where the data comes from",
    description:
      "Provenance for ownership, metadata, and every contract address — with how to verify it yourself.",
  },
  {
    slug: "urls",
    title: "How URLs are built",
    description:
      "Anatomy of an artifact URI and exactly how Whitehash turns it into a fetchable URL.",
  },
  {
    slug: "glossary",
    title: "Glossary",
    description:
      "One word per concept, mapped to fxhash's own vocabulary and the on-chain reality.",
  },
]

function Table({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  return (
    <div className="understand-table-wrap overflow-x-auto">
      <table className="understand-table w-full border-collapse text-left text-sm">
        <thead>
          <tr>
            {head.map(h => (
              <th key={h} className="border-b border-line-strong px-3 py-2 font-medium text-fg">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="align-top">
              {row.map((cell, j) => (
                <td key={j} className="border-b border-line px-3 py-3 text-muted [&_code]:text-fg">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* — 1. Overview: the minimum mental model — */
function Overview() {
  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Understand"
        title="How Whitehash works"
        description="Three ideas explain the API: projects generate tokens, previews are not live artwork, and reads go directly to public RPCs, indexers, and gateways."
      />
      <DocsSection title="1. A project generates tokens">
        <div className="docs-prose">
          <p>
            A <strong>project</strong> is a generative release. A <strong>token</strong> is one
            minted iteration with its own identity and deterministic seed. Whitehash exposes both
            directly instead of hiding them behind a generic collection object.
          </p>
        </div>
        <CodeBlock
          className="mt-4"
          language="text"
          code={`project { chain, id }
  └─ token { chain, contract, tokenId }`}
        />
      </DocsSection>
      <DocsSection title="2. A preview is not the artwork">
        <div className="docs-prose">
          <p>
            <code>displayUri</code> and <code>thumbnailUri</code> are static images.{" "}
            <code>artifactUri</code> is executable HTML. <code>Artwork</code> shows the preview
            first, then builds the correctly seeded live URL and runs it in a restricted iframe.
          </p>
        </div>
      </DocsSection>
      <DocsSection title="3. One shape across every chain">
        <div className="docs-prose">
          <p>
            Tezos, Ethereum, and Base store and index fxhash work differently. Whitehash reads known
            contracts through configurable third-party services, normalizes the results into{" "}
            <code>WhitehashProject</code> and <code>WhitehashToken</code>, and resolves IPFS or
            onchfs content without a Whitehash-hosted backend.
          </p>
        </div>
        <CodeBlock
          className="mt-4"
          language="text"
          code={`chain + public indexer/RPC
  → normalized project or token
  → content-addressed preview and live artwork`}
        />
      </DocsSection>
      <Callout>
        Want to verify the details? The{" "}
        <Link className="docs-text-link" href="/understand/sources">
          data sources
        </Link>{" "}
        and{" "}
        <Link className="docs-text-link" href="/understand/urls">
          URL anatomy
        </Link>{" "}
        pages document the complete path.
      </Callout>
    </DocsPage>
  )
}

/* — 2. Data model — */
function DataModel() {
  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Understand"
        title="Projects and tokens"
        description="Two domain objects carry the API: a project is the generator; a token is one minted iteration."
      />
      <DocsSection title="Identity lives on the object">
        <div className="docs-prose">
          <p>
            Tokens identify themselves with <code>chain</code>, <code>contract</code>, and{" "}
            <code>tokenId</code>. Projects use <code>chain</code> and <code>id</code>. Pass those
            fields directly to read APIs.
          </p>
        </div>
        <CodeBlock
          className="mt-4"
          language="tsx"
          code={`const token = useToken({ chain, contract, tokenId })

// Discovery returns the same identity fields inline.
const { projects } = useProjects({ chain: "eip155:1" })
const selected = projects[0]
const result = useProject({ chain: selected.chain, id: selected.id })`}
        />
      </DocsSection>
      <DocsSection title="WhitehashToken — one minted iteration">
        <Table
          head={["Field", "Source", "Null when"]}
          rows={[
            [<code>chain</code>, "The network the token lives on", "never"],
            [
              <code>contract</code>,
              "The token’s contract (Tezos gentk FA2, or an EVM collection)",
              "never",
            ],
            [<code>tokenId</code>, "On-chain token ID / iteration index", "never"],
            [<code>name</code>, "Metadata JSON", "metadata omits it"],
            [
              <code>iterationHash</code>,
              <>
                The fxhash <strong>seed</strong> (gentk-v1: a separate metadata field; v2/v3 &amp;
                EVM: embedded in the artifact URI)
              </>,
              "token is unrevealed",
            ],
            [
              <code>artifactUri</code>,
              <>
                Metadata — the executable generator URL (<code>ipfs://</code>/<code>onchfs://</code>
                ) with render state
              </>,
              "metadata omits it",
            ],
            [
              <>
                <code>displayUri</code> / <code>thumbnailUri</code>
              </>,
              "Metadata — static preview images",
              "no preview published",
            ],
            [
              <code>generatorUri</code>,
              "Metadata — the project’s reusable generator, without render params",
              "not published (common on old v1)",
            ],
            [
              <code>attributes</code>,
              "Metadata features, folded to {name, value}",
              "empty array, never null",
            ],
            [<code>assigned</code>, "Derived: false = unrevealed placeholder", "never (boolean)"],
            [<code>raw</code>, "The untouched source metadata JSON", "never (may be null value)"],
          ]}
        />
      </DocsSection>
      <DocsSection title="WhitehashProject — one generative project">
        <Table
          head={["Field", "Source", "Null when"]}
          rows={[
            [<code>chain</code>, "The network the project lives on", "never"],
            [
              <code>id</code>,
              <>
                EVM collection contract, or a Tezos issuer entry such as <code>v3:13623</code>
              </>,
              "never",
            ],
            [
              <>
                <code>name</code> / <code>description</code>
              </>,
              "Project metadata JSON",
              "metadata omits it",
            ],
            [
              <>
                <code>displayUri</code> / <code>thumbnailUri</code>
              </>,
              "Project metadata preview",
              "no preview",
            ],
            [<code>editions</code>, "The mint cap (max supply)", "unknown for this generation"],
            [<code>minted</code>, "Iterations actually created so far", "unknown"],
            [
              <code>captureSettings</code>,
              "Normalized project capture mode, trigger, resolution, delay, selector, GPU, and GIF settings",
              "project metadata does not publish capture configuration",
            ],
          ]}
        />
      </DocsSection>
      <Callout>
        <strong>Refs are optional.</strong> Use <code>projectRef()</code>, <code>tokenRef()</code>,
        and <code>formatRef()</code> only when a route or paste field needs one serialized value.
        Ordinary reads use the identity fields above.
      </Callout>
    </DocsPage>
  )
}

/* — 3. Sources / provenance — */
const TEZOS_ADDRESSES: [string, string, string][] = [
  ["gentk v1", "KT1KEa8z6vWXDJrVqtMrAeDVzsvxat3kHaCE", "KT1ExHjELnDuat9io3HkDcrBhHmek7h8EVXG"],
  ["gentk v2", "KT1U6EHmNxJTkvaWJ4ThczG4FSDaHC21ssvi", "KT1NkZho1yRkDdQnN4Mz93sDYyY2pPrEHTNs"],
  ["gentk v3", "KT1EfsNuqwLAWDd3o4pvfUx1CAh5GMdTrRvr", "KT1TtVAyjh4Ahdm8sLZwFnL7tqoLf59XrK2h"],
  ["issuer v0", "KT1AEVuykWeuuFX7QkEAMNtffzwhe1Z98hJS", "KT1PyfrDD85RxUWz8dMHoC92MxdPzecSQ5t9"],
  ["issuer v1", "KT1XCoGnfupWk7Sp8536EfrxcP73LmT68Nyr", "KT1QwWVZogqPZZtGSVxGpLkEWar7LFvAsMdd"],
  ["issuer v2", "KT1BJC12dG17CVvPKJ1VYaNnaT5mzfnUTwXv", "KT1Sy7X6TubmZ39G8CHVrUcxjc3jiF68P8oB"],
  ["issuer v3", "KT1Xpmp15KfqoePNW9HczFmqaGNHwadV2a3b", "KT1DfymMp3qD5Pd5ujPjp7UsQbppY9yY1Hbf"],
]
const EVM_FACTORIES: [string, string, string][] = [
  ["Ethereum (eip155:1)", "0x442295de8A31d65026dBc09c29d469F6854f188a", "18762350"],
  ["Base (eip155:8453)", "0xf05636d65c7a10dF989eC2411D4F3230d3A02f3D", "10786140"],
  ["Sepolia (eip155:11155111)", "0x4e9ef916F55B5d4a27E6406C7Ce8bcd29c2693d6", "5013011"],
  ["Base Sepolia (eip155:84532)", "0x60cFDE3aaf6E938535767794088cf15EaaC50019", "8763620"],
]

function Sources() {
  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Understand"
        title="Where the data comes from"
        description="Every fact Whitehash shows comes from a chain, public indexer, RPC, or content-addressed file. Every trusted address is listed here and verifiable on a block explorer."
      />
      <DocsSection title="Facts and their sources">
        <Table
          head={["Fact", "Read from"]}
          rows={[
            [<>Ownership (Tezos)</>, <>TzKT token balances on the gentk contracts</>],
            [
              <>Ownership (Ethereum / Base)</>,
              <>
                Blockscout token holdings intersected with the discovered fxhash collection set
                (JSON-RPC <code>Transfer</code>-log fallback)
              </>,
            ],
            [
              <>Token metadata</>,
              <>
                Tezos <code>token_metadata</code> big map / EVM <code>tokenURI</code>, then the
                content-addressed JSON via your IPFS gateways
              </>,
            ],
            [
              <>Projects</>,
              <>
                Tezos issuer ledger big maps / EVM <code>ProjectCreated</code> factory events
              </>,
            ],
            [<>Artwork bytes</>, <>IPFS gateways, or onchfs read directly from chain</>],
          ]}
        />
      </DocsSection>
      <DocsSection title="Tezos contracts">
        <div className="docs-prose">
          <p>
            These FA2 gentk and issuer contracts are fxhash&rsquo;s own deployments, vendored into
            the toolkit. Verify any of them on{" "}
            <a className="docs-text-link" href="https://tzkt.io" target="_blank" rel="noreferrer">
              tzkt.io
            </a>
            .
          </p>
        </div>
        <Table
          head={["Contract", "Mainnet", "Ghostnet"]}
          rows={TEZOS_ADDRESSES.map(([label, main, ghost]) => [
            label,
            <code className="text-xs">{main}</code>,
            <code className="text-xs">{ghost}</code>,
          ])}
        />
      </DocsSection>
      <DocsSection title="EVM issuer factories">
        <div className="docs-prose">
          <p>
            Each network has one <code>FxIssuerFactory</code>; collections are discovered from its{" "}
            <code>ProjectCreated</code> events since deploy block. Verify on the relevant explorer.
          </p>
        </div>
        <Table
          head={["Network", "FxIssuerFactory", "Deploy block"]}
          rows={EVM_FACTORIES.map(([label, addr, block]) => [
            label,
            <code className="text-xs">{addr}</code>,
            <code>{block}</code>,
          ])}
        />
      </DocsSection>
      <Callout>
        Contract addresses live in <code>@whitehash/chain-reader</code> (<code>networks.ts</code>).
        This table is the same data — if the two ever diverge, the code is the source of truth.
      </Callout>
    </DocsPage>
  )
}

/* — 4. How URLs are built (interactive) — */
function UrlAnatomy() {
  const { client } = useWhitehash()
  const [value, setValue] = useState(
    "ipfs://QmSYxhg1TWP9pMeSYAPDj23cf4MAo3nA4iF3kErq611KRG/?fxhash=oo…#0x…",
  )
  let resolved: string | null = null
  let error: string | null = null
  try {
    resolved = client.resolveUri(value.trim(), { chain: "tezos:mainnet" })
  } catch (cause) {
    error = cause instanceof Error ? cause.message : String(cause)
  }
  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Understand"
        title="How URLs are built"
        description="A token's render URL carries the seed and parameters that make one iteration deterministic. Here is how Whitehash constructs and resolves it."
      />
      <DocsSection title="Anatomy of an artifact URI">
        <CodeBlock
          language="text"
          code={`ipfs://Qm…generator…/?fxhash=oo…&fxiteration=136&fxminter=tz1…&fxchain=tezos#0x…params…
└─ scheme  └─ generator CID   └─ seed        └─ iteration   └─ minter      └─ chain      └─ fx(params) bytes`}
        />
        <div className="docs-prose mt-4">
          <p>
            <strong>scheme</strong> — <code>ipfs://</code> or <code>onchfs://</code> decides how the
            bytes are fetched.
          </p>
          <p>
            <strong>
              seed (<code>fxhash</code>)
            </strong>{" "}
            — makes the iteration deterministic. For gentk-v1, the seed is <em>not</em> in the URI;
            Whitehash reads it from the separate <code>iterationHash</code> metadata field and
            appends it. v2/v3 and EVM embed it.
          </p>
          <p>
            <strong>
              fragment (<code>#0x…</code>)
            </strong>{" "}
            — encoded fx(params). Preserved verbatim; dropping it changes the artwork.
          </p>
        </div>
      </DocsSection>
      <DocsSection title="From URI to fetchable URL">
        <Table
          head={["Input", "resolveUri result"]}
          rows={[
            [
              <code>ipfs://CID/path?q#f</code>,
              <>
                &lt;first gateway&gt;<code>/ipfs/CID/path?q#f</code> (query &amp; fragment
                preserved; <code>useGatewayImage</code> advances on error)
              </>,
            ],
            [
              <code>onchfs://CID</code>,
              <>
                same-origin worker path <code>/.whitehash/onchfs/&lt;chain&gt;/CID</code>, or your
                configured proxy
              </>,
            ],
            [
              <>
                <code>https:</code> / <code>data:</code>
              </>,
              "passed through unchanged",
            ],
            [
              <>
                bare <code>CID</code>
              </>,
              "treated as ipfs",
            ],
          ]}
        />
      </DocsSection>
      <DocsSection title="Try it">
        <div className="docs-prose">
          <p>
            Paste an <code>ipfs://</code>, <code>onchfs://</code>, or bare-CID value. This runs the
            real <code>resolveUri</code> from your configured client.
          </p>
        </div>
        <Input className="mt-4" value={value} onChange={e => setValue(e.target.value)} />
        <div className="mt-3">
          {error ? (
            <Badge variant="danger">{error}</Badge>
          ) : resolved ? (
            <p className="break-all font-mono text-xs leading-6 text-fg">{resolved}</p>
          ) : (
            <Badge variant="warning">
              Not resolvable with the current config (e.g. onchfs without a resolver enabled).
            </Badge>
          )}
        </div>
      </DocsSection>
      <Callout>
        The same <code>artworkUrl(token)</code> helper applies the v1 seed and resolves the scheme
        in one step, so components never construct URLs by hand.
      </Callout>
    </DocsPage>
  )
}

/* — 5. Glossary — */
function Glossary() {
  return (
    <DocsPage>
      <DocsHeading
        eyebrow="Understand"
        title="Glossary"
        description="Whitehash uses one term per concept, aligned with fxhash vocabulary across the API, components, and docs."
      />
      <DocsSection title="One language">
        <Table
          head={["Whitehash term", "fxhash / on-chain reality"]}
          rows={[
            [
              <strong>project</strong>,
              <>
                A generative artwork release. fxhash calls this a <em>Generative Token</em>; on
                Tezos it is an issuer-ledger entry, on EVM its own collection contract.
              </>,
            ],
            [
              <strong>token</strong>,
              <>
                One minted iteration. fxhash&rsquo;s <em>gentk</em> / objkt; an FA2 or ERC-721
                token.
              </>,
            ],
            [
              <strong>iteration</strong>,
              <>The edition number within a project (token #136 of 500).</>,
            ],
            [
              <strong>seed</strong>,
              <>
                The hash that makes an iteration deterministic. fxhash: <code>fxhash</code> / the{" "}
                <code>iterationHash</code> metadata field.
              </>,
            ],
            [
              <strong>artifact</strong>,
              <>
                The executable generator HTML (<code>artifactUri</code>). Distinct from the preview
                image.
              </>,
            ],
            [
              <strong>display / thumbnail</strong>,
              <>
                Static preview images (<code>displayUri</code> / <code>thumbnailUri</code>) —
                fxhash&rsquo;s own metadata field names.
              </>,
            ],
            [
              <strong>ref</strong>,
              <>
                An optional serialized form of project or token identity, useful for routes and
                paste fields. Normal read APIs accept the object&rsquo;s identity fields directly.
              </>,
            ],
          ]}
        />
      </DocsSection>
      <Callout>
        Words we deliberately avoid: &ldquo;collection&rdquo; for a project (except where it
        literally means the EVM collection contract), and &ldquo;piece/artwork&rdquo; as a synonym
        for token. One concept, one word.
      </Callout>
    </DocsPage>
  )
}

export function UnderstandPage({ slug }: { slug: string }) {
  switch (slug) {
    case "data-model":
      return <DataModel />
    case "sources":
      return <Sources />
    case "urls":
      return <UrlAnatomy />
    case "glossary":
      return <Glossary />
    default:
      return <Overview />
  }
}
