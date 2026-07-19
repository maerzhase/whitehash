# @whitehash/runtime

Framework-free controls for running a content-addressed fxhash generator with a chosen
seed and fx(params). The core has no React import and no hosted fxhash default. The
optional `@whitehash/runtime/react` entry exposes the iframe and controller hook.

The controller and parameter codec are extracted from the MIT-licensed fxhash runtime;
vendored files retain attribution headers. Platform configuration was replaced by an
injected URI resolver, so IPFS/onchfs transport remains caller-owned.

```ts
import {
  BlockchainType,
  createRuntimeConnector,
  createRuntimeController,
} from "@whitehash/runtime"

const connector = createRuntimeConnector({
  resolveUri: uri => client.resolveUri(uri, { chain: token.chain }),
})
const controller = createRuntimeController({
  state: {
    cid: token.generatorUri,
    chain: BlockchainType.TEZOS,
    hash: token.iterationHash,
    snippetVersion: token.raw.snippetVersion,
    inputBytes,
    definition: token.raw.params,
  },
  options: { connector, autoRefresh: true },
})
controller.init(iframe)
controller.controls().update({ density: 7 }, definitions, { forceRefresh: true })
```

## React

```tsx
import { ArtworkIframe, useRuntimeController } from "@whitehash/runtime/react"

function Explore({ state, connector }) {
  const runtime = useRuntimeController({ state, options: { connector, autoRefresh: true } })
  return <ArtworkIframe ref={runtime.ref} title="Artwork variation" />
}
```

`ArtworkIframe` supplies the same sandbox and device-permission defaults used by the
viewer. `useRuntimeController` releases event listeners when its controller changes or
the component unmounts.

## API

| Export | Purpose |
| --- | --- |
| `createRuntimeController({ state, options })` | Own runtime state, parameter controls, URL generation, and iframe synchronization |
| `createRuntimeConnector({ resolveUri, ... })` | Inject content resolution and optional self-hosted emulator/legacy bases |
| `directRuntimeConnector` | Accept only already-resolved HTTP/data/blob generator URIs |
| `runtimeContext`, `runtimeControls` | Use the state and fx(params) layers independently |
| `serializeParams`, `deserializeParams` | Encode/decode fx(params) input bytes |
| `BlockchainType`, runtime/parameter types | Build typed project and control state |
| `@whitehash/runtime/react` | `ArtworkIframe`, `useRuntimeController` |

The core is ESM-only. React `>=18.3 <20` is an optional peer because consumers of the
framework-free entry do not need React.
