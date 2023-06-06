export type PrivateInputs = {
  sourceIdentifier: BigInt;
  sourceSecret: BigInt;
  sourceVaultNamespace: BigInt;
  vaultSecret: BigInt;
  sourceCommitmentReceipt: BigInt[];
  destinationSecret: BigInt;
  destinationCommitmentReceipt: BigInt[];
  accountMerklePathElements: BigInt[];
  accountMerklePathIndices: number[];
  accountsTreeRoot: BigInt;
  registryMerklePathElements: BigInt[];
  registryMerklePathIndices: number[];
  sourceValue: BigInt;
};

export type PublicInputs = {
  vaultIdentifier: BigInt;
  vaultNamespace: BigInt;
  commitmentMapperPubKey: BigInt[];
  registryTreeRoot: BigInt;
  requestIdentifier: BigInt;
  proofIdentifier: BigInt;
  destinationIdentifier: BigInt;
  claimValue: BigInt;
  accountsTreeValue: BigInt;
  claimComparator: BigInt;
  sourceVerificationEnabled: BigInt;
  destinationVerificationEnabled: BigInt;
  extraData: BigInt;
};

export type Inputs = {
  privateInputs: PrivateInputs;
  publicInputs: PublicInputs;
};
