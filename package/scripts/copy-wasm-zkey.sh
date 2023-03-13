#!/bin/bash -e

cd "$(git rev-parse --show-toplevel)"

# Uncomment next lines to update Trusted setup
cp "./artifacts/circuits/hydra-s2_js/hydra-s2.wasm" "./package/src/prover"
cp "./artifacts/circuits/hydra-s2.zkey" "./package/src/prover"