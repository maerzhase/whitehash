---
"@whitehash/archive": major
---

Add the wallet-to-offline-folder archive CLI. It discovers normalized tokens through the
public chain reader, downloads IPFS generator DAGs as trustless-gateway CAR files,
verifies every SHA-256 multihash before extracting UnixFS, reads onchfs generators
directly from public chains, preserves metadata and previews, and emits local replay
wrappers plus integrity manifests. The initial release deliberately implements the CAR
and UnixFS verification boundary locally so archiving does not add an unreviewed or
network-fetched dependency during the unattended run.
