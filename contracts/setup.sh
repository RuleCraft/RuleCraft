#!/usr/bin/env sh
# Downloads the pinned Uniswap v4-core sources and the two test libraries it uses
# into contracts/lib. Needs curl and tar. Then: forge build && forge test
set -e
cd "$(dirname "$0")"
V4=46c6834698c48bc4a463a86d8420f4eb1d7f3b75
FORGE_STD=1de6eecf821de7fe2c908cc48d3ab3dced20717f
SOLMATE=4b47a19038b798b4a33d9749d25e570443520647

fetch() { # repo sha target
  mkdir -p "$3"
  curl -fsSL "https://github.com/$1/archive/$2.tar.gz" | tar xz -C "$3" --strip-components 1
}

if [ ! -f lib/v4-core/src/PoolManager.sol ]; then
  rm -rf lib/v4-core
  fetch Uniswap/v4-core "$V4" lib/v4-core
  fetch foundry-rs/forge-std "$FORGE_STD" lib/v4-core/lib/forge-std
  fetch transmissions11/solmate "$SOLMATE" lib/v4-core/lib/solmate
fi
echo "v4-core ready at $V4"
