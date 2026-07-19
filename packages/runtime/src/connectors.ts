/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
import type { IRuntimeConnector } from "./interfaces.js"
import type { ProjectState } from "./types.js"
import { fxParamsAsQueryParams, quickHash } from "./utils.js"

/**
 * A static map of the project state properties to their respective
 * url parameter query key.
 */
const QUERY_KEYS: Record<string, string> = Object.freeze({
  hash: "fxhash",
  chain: "fxchain",
  minter: "fxminter",
  iteration: "fxiteration",
  context: "fxcontext",
})

/**
 * Get the URLSearchParams from a project given its state.
 * @param state - The project state
 * @param options
 * @param options.fxParamsAsQueryParams - If the fx(params)
 * should be passed as query params
 * @param options.noFxParamsUpdateQuery - If the fx(params)
 * should not be updated in the query
 * @param options.additionalParams - Additional params
 * to be added to the URLSearchParams
 * @returns The URLSearchParams string
 */
export function getURLSearchParams(
  state: Omit<ProjectState, "cid" | "snippetVersion">,
  options: {
    fxParamsAsQueryParams?: boolean
    noFxParamsUpdateQuery?: boolean
    additionalParams?: URLSearchParams
    noParentHashUpdateQuery?: boolean
  } = {}
): string {
  const { inputBytes, parentHashes, ...stateWithoutParamsAndLineage } = state
  const urlSearchParams = new URLSearchParams({
    ...Object.entries(stateWithoutParamsAndLineage).reduce(
      (acc, [key, value]) => {
        if (value == null) return acc
        const newKey = QUERY_KEYS[key] || key
        return { ...acc, [newKey]: value }
      },
      {}
    ),
    ...Object.fromEntries(options.additionalParams || []),
  })
  let paramsString = urlSearchParams.toString()
  const hasLineage = parentHashes && parentHashes.length > 0
  if (hasLineage) {
    if (!options.noParentHashUpdateQuery) {
      paramsString += `&parentHashesUpdate=${quickHash(parentHashes.join(""))}`
    }
    paramsString += `#lineage=${parentHashes.join(",")}`
  }
  if (inputBytes) {
    // I older version params where query params
    // in newer version they are in hash
    if (options.fxParamsAsQueryParams) {
      paramsString += `&fxparams=${inputBytes}`
    } else {
      if (!options.noFxParamsUpdateQuery) {
        paramsString += `&fxparamsUpdate=${quickHash(inputBytes)}`
      }
      if (!hasLineage) {
        paramsString += `#0x${inputBytes}`
      } else {
        paramsString += `&params=0x${inputBytes}`
      }
    }
  }
  return paramsString
}

/**
 * Given a base url and a project state, return the project URL.
 * @param baseUrl - The base URL of the project
 * @param state - The project state
 * @param urlParams - Additional URLSearchParams
 * @returns The project URL
 */

export const getProjectUrl = (
  baseUrl: string,
  state: ProjectState,
  urlParams?: URLSearchParams
) => {
  const { snippetVersion, cid: _cid, ...projectState } = state
  void _cid
  const params = getURLSearchParams(projectState, {
    additionalParams: urlParams,
    fxParamsAsQueryParams: fxParamsAsQueryParams(snippetVersion),
  })
  return `${baseUrl}/?${params}`
}

export interface RuntimeConnectorConfig {
  /** Resolve a content URI without relying on fxhash-hosted infrastructure. */
  resolveUri: (uri: string, state: ProjectState) => string | null
  /** Optional local file-emulator base; disabled by default. */
  fsEmulatorBase?: string | null
  /** Optional self-hosted legacy wrapper; disabled by default. */
  legacyWrapperBase?: string | null
}

/**
 * Build a runtime connector from caller-owned infrastructure. Content URIs are
 * resolved by the injected function; pre-mint and legacy services never acquire
 * hidden hosted defaults.
 */
export function createRuntimeConnector(
  config: RuntimeConnectorConfig
): IRuntimeConnector {
  return {
    getUrl(state: ProjectState, urlParams?: URLSearchParams) {
      const resolved = config.fsEmulatorBase
        ? `${config.fsEmulatorBase.replace(/\/$/, "")}/resolve/${state.cid}`
        : config.resolveUri(state.cid, state)
      if (!resolved) throw new Error(`Unable to resolve runtime URI: ${state.cid}`)
      if (state.legacy && !config.legacyWrapperBase) {
        throw new Error("Legacy runtimes require an explicit legacyWrapperBase")
      }
      const baseUrl = state.legacy
        ? `${config.legacyWrapperBase!.replace(/\/$/, "")}?url=${encodeURIComponent(resolved)}`
        : resolved
      return getProjectUrl(baseUrl, state, urlParams)
    },
  }
}

/** A no-host-default connector for already resolved HTTP/data/blob project URIs. */
export const directRuntimeConnector: IRuntimeConnector = createRuntimeConnector({
  resolveUri: uri => (/^(https?|data|blob):/i.test(uri) ? uri : null),
})
