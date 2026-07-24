import { CHAIN_DEFINITIONS } from "@whitehash/core"

export interface OnchfsWorkerNetwork {
  slug: string
  blockchain: string
  rpcs: readonly string[]
}

export const ONCHFS_WORKER_NETWORKS: readonly OnchfsWorkerNetwork[] = CHAIN_DEFINITIONS.map(
  network => ({
    slug: network.slug,
    blockchain: network.onchfsNetwork,
    rpcs: network.defaultRpcs,
  }),
)
