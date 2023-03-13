#!/bin/bash -e

cd "$(git rev-parse --show-toplevel)"

mkdir -p package/lib
cp "./package/src/prover/hydra-s2.zkey" "./package/lib/cjs"
cp "./package/src/prover/hydra-s2.wasm" "./package/lib/cjs"
cp "./package/src/verifier/hydra-s2-verification-key.json" "./package/lib/cjs"
cp "./package/src/verifier/hydra-s2-verification-key.json" "./package/lib/esm"