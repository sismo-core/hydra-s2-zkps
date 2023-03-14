export const wasmPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s2.wasm") : null;
export const zkeyPath =
  process.env.MODULE_FORMAT != "esm" ? require.resolve("./hydra-s2.zkey") : null;
