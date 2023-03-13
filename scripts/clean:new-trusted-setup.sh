#!/bin/bash -e
rm -rf artifacts
rm -rf cache
rm -rf node_modules
rm -rf types

rm -rf ./package/node_modules
rm -rf ./package/lib
rm -rf ./package/types

# new trusted setup

rm -rf ./package/contracts/HydraS2Verifier.sol
rm -rf ./package/src/prover/hydra-s2.wasm
rm -rf ./package/src/prover/hydra-s2.zkey
rm -rf ./package/src/verifier/hydra-s2-verification-key.json