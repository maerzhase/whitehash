export interface OnchfsWorkerNetwork {
  slug: string
  blockchain: string
  rpcs: string[]
}

export const ONCHFS_WORKER_NETWORKS: readonly OnchfsWorkerNetwork[] = [
  { slug: "tezos-mainnet", blockchain: "tezos:NetXdQprcVkpaWU", rpcs: ["https://mainnet.tezos.ecadinfra.com", "https://mainnet.tezos.marigold.dev", "https://rpc.tzbeta.net"] },
  { slug: "tezos-ghostnet", blockchain: "tezos:NetXnHfVqm9iesp", rpcs: ["https://ghostnet.tezos.ecadinfra.com", "https://ghostnet.tezos.marigold.dev"] },
  { slug: "eip155-1", blockchain: "eip155:1", rpcs: ["https://eth.llamarpc.com", "https://ethereum-rpc.publicnode.com"] },
  { slug: "eip155-11155111", blockchain: "eip155:11155111", rpcs: ["https://ethereum-sepolia-rpc.publicnode.com"] },
  { slug: "eip155-8453", blockchain: "eip155:8453", rpcs: ["https://mainnet.base.org", "https://base-rpc.publicnode.com"] },
  { slug: "eip155-84532", blockchain: "eip155:84532", rpcs: ["https://sepolia.base.org"] },
]
