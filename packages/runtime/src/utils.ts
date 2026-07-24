/**
 * Vendored from fxhash.xyz under the MIT License.
 * Copyright (c) fxhash contributors.
 * Source: https://github.com/fxhash/fxhash.xyz
 */
// biome-ignore-all lint/suspicious/noExplicitAny: upstream runtime utilities operate on dynamic project data
import {
  type FxParamDefinition,
  type FxParamDefinitions,
  type FxParamsData,
  type FxParamType,
  jsonStringifyBigint,
} from "./params/index.js"
import { float2hex, xorshiftString } from "./vendor/index.js"
import { mergeRuntime } from "./vendor/object.js"
import semver from "semver"
import type { RuntimeDefinition, RuntimeState, RuntimeWholeState } from "./types.js"

/**
 * Returns a boolean based on the provided snippet version. The boolean
 * determines if the inputBytes of fx(params) should be passed as query
 * params the the project url or not. Start from versions larger than 3.2.0,
 * the inputBytes should be passed as hash to the url.
 */
export function fxParamsAsQueryParams(snippetVersion: string | undefined): boolean {
  return !semver.valid(snippetVersion) || (!!snippetVersion && semver.lte(snippetVersion, "3.2.0"))
}

/**
 * This is a helper function that checks if the snippet version is valid for the
 * case that we accidentally saved the snippet version in the version field of
 * the token metadata.
 */
export function isValidSnippetVersionInVersion(snippetVersion: string): boolean {
  return !!semver.valid(snippetVersion) && semver.eq(snippetVersion, "3.0.1")
}

/**
 * Given a project with its metadata this function will return the
 * snippetVersion if it exists.
 *
 * Why is this relevant? Starting with version 3.0.1 we actually expect to pass
 * the snippetVersion to the runtime because before version 3.0.1 there was
 * a max of 64 characters on byte params. therefore to compute the right
 * inputbytes from the actual params we need to pass the snippeVersion
 * to the runtime.
 */
export function getSnippetVersionFromProject(project: {
  metadata: Record<string, any>
}): string | undefined {
  if (project.metadata.snippetVersion) return project.metadata.snippetVersion
  if (isValidSnippetVersionInVersion(project.metadata.version)) return project.metadata.version
  return undefined
}

/**
 * Given a project with its metadata this function will return the
 * cid of the project.
 *
 * Why is this relevant? Although its in general prefered
 * to use the genrative_uri for the source of an artwork generator.
 * Early projects do not store the previewHash in their metadata. Therefore
 * it is required to use the actual artifactUri in the runtime in order to
 * reconstruct the preview image.
 */
export function getCidFromProject(project: {
  generative_uri: string
  metadata: Record<string, any>
}): string {
  if (!project.metadata.previewHash && project.metadata.artifactUri)
    return project.metadata.artifactUri
  return project.generative_uri
}

/**
 * Enhance param definitions with a version number.
 */
export function addVersionToParamsDefinition(
  definition: FxParamDefinitions,
  version: string | null | undefined,
) {
  return definition.map(p => ({
    ...p,
    version: version || undefined,
  }))
}

/**
 * Enhances the runtime definition with the version of the runtime.
 * Adding the version number to each control definition can be useful for
 * granular control of the runtime controls.
 * @param runtime - The runtime
 * @returns The enhanced runtime definition
 */
export function enhanceRuntimeDefinition(runtime: RuntimeWholeState): RuntimeDefinition {
  return {
    ...runtime.definition,
    params: addVersionToParamsDefinition(
      runtime.definition.params || [],
      runtime.definition.version || null,
    ),
  }
}

/**
 * Hashes a string using float2hex and xorshiftString.
 * @param data
 * @returns The hashed string
 * @internal
 */
export function quickHash(data: string): string {
  return float2hex(xorshiftString(data))
}

/**
 * Hashes a runtime state using float2hex and xorshiftString.
 * @internal
 */
export function hashRuntimeState(state: RuntimeState) {
  return quickHash(jsonStringifyBigint(state))
}

/**
 * Hashes the hard-refresh properties of a runtime state:
 * - hash
 * - minter address
 * - params in update mode "page-reload"
 * @internal
 */
export function hashRuntimeHardState(
  state: RuntimeState,
  definition: FxParamDefinition<FxParamType>[] | null,
) {
  const staticParams: FxParamsData = {}
  for (const id in state.params) {
    const def = definition?.find(def => def.id === id)
    // if no definition, or update == "page-reload" (which is default value)
    if (!def || !def.update || def.update === "page-reload") {
      staticParams[id] = state.params[id]
    }
  }
  return hashRuntimeState({
    ...state,
    params: staticParams,
  })
}

/**
 * Lodash mergeWith customizer that
 * - keeps Uint8Array types alive
 * - avoids merging arrays just use source
 * @internal
 */

function mergeCustomizer(_: any, source: any) {
  if (source instanceof Uint8Array) {
    return new Uint8Array(source)
  }
  if (Array.isArray(source)) {
    return source
  }
  return undefined
}

/**
 * Merges two objects, but keeps Uint8Array types.
 * @param object - The object to merge into
 * @param source - The source object
 * @returns The merged object
 * @internal
 */
export const mergeWithKeepingUint8ArrayType = (object: any, source: any) => {
  // Preserve the upstream customizer's behavior: clone byte arrays and replace arrays.
  void mergeCustomizer
  return mergeRuntime(object, source)
}
