/**
 * Minimal ABIs, extracted from the fxhash monorepo generated ABIs (MIT).
 * Only the fragments whitehash needs to read ownership and metadata.
 */
import { parseAbi } from "viem"

/** FxIssuerFactory — emitted when a new FxGenArt721 collection is deployed. */
export const issuerFactoryAbi = parseAbi([
  "event ProjectCreated(uint96 indexed _projectId, address indexed _genArtToken, address indexed _owner)",
])

/** FxGenArt721 (ERC-721) — the per-collection token contract. */
export const genArtAbi = parseAbi([
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function balanceOf(address owner) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
])
