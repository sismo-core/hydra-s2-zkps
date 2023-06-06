import { buildPoseidon, EddsaPublicKey, SNARK_FIELD } from "@sismo-core/crypto";
import { KVMerkleTree, MerklePath } from "@sismo-core/kv-merkle-tree";
import { BigNumber, BigNumberish, ethers } from "ethers";
import { groth16 } from "snarkjs";
import {
  ACCOUNTS_TREE_HEIGHT,
  PrivateInputs,
  PublicInputs,
  REGISTRY_TREE_HEIGHT,
} from ".";
import { wasmPath, zkeyPath } from "./files";
import { SnarkProof } from "./snark-proof";
import { Inputs } from "./types";
import { verifyCommitment } from "./utils/verify-commitment";
import { isSourceHydraS2Account } from "./utils/isSourceHydraS2Account";

export type CircuitPath = { wasmPath: string; zkeyPath: string } | null;

export type HydraS2Account = {
  identifier: BigNumberish;
  secret: BigNumberish;
  commitmentReceipt: [BigNumberish, BigNumberish, BigNumberish];
};

export type VaultAccount = {
  identifier: BigNumberish;
  secret: BigNumberish;
  namespace: BigNumberish;
};

export type SourceInput = (HydraS2Account | VaultAccount) & { 
  verificationEnabled: boolean 
};

export type VaultInput = {
  secret: BigNumberish;
  namespace?: BigNumberish;
};

export type ClaimInput = {
  value?: BigNumberish;
  // A comparator of 0 means the accounts value in the tree can be more than the value in the claim
  // A comparator of 1 means the accounts value in the tree must be equal to the value in the claim
  comparator?: number;
  registryTree: KVMerkleTree;
  accountsTree: KVMerkleTree;
};

export type DestinationInput = Partial<HydraS2Account> & {
  verificationEnabled: boolean;
};

export type UserParams = {
  vault?: VaultInput;
  source?: SourceInput;
  destination?: DestinationInput;
  claim?: ClaimInput;
  requestIdentifier?: BigNumberish;
  extraData?: BigNumberish;
};

export type formattedUserParams = {
  vaultSecret: BigInt;
  vaultNamespace: BigInt;
  vaultIdentifier: BigInt;
  sourceVaultNamespace: BigInt;
  sourceIdentifier: BigInt;
  sourceSecret: BigInt;
  sourceCommitmentReceipt: BigInt[];
  destinationIdentifier: BigInt;
  destinationSecret: BigInt;
  destinationCommitmentReceipt: BigInt[];
  claimValue: BigInt;
  requestIdentifier: BigInt;
  proofIdentifier: BigInt;
  claimComparator: BigInt;
  sourceVerificationEnabled: BigInt;
  destinationVerificationEnabled: BigInt;
  extraData: BigInt;
};

export class HydraS2Prover {
  private commitmentMapperPubKey: EddsaPublicKey;
  private esmOverrideCircuitPath: CircuitPath;

  constructor(
    commitmentMapperPubKey: EddsaPublicKey,
    esmOverrideCircuitPath: CircuitPath = null
  ) {
    this.commitmentMapperPubKey = commitmentMapperPubKey;
    this.esmOverrideCircuitPath = esmOverrideCircuitPath;
  }

  public async format({
    vault,
    source,
    destination,
    claim,
    requestIdentifier: requestIdentifierInput,
    extraData: extraDataInput,
  }: UserParams): Promise<formattedUserParams> {
    const poseidon = await buildPoseidon();

    if (vault?.secret && source?.secret && !isSourceHydraS2Account(source) && !BigNumber.from(vault.secret).eq(source?.secret)) {
      throw new Error("vault.secret must be identical to source.secret");
    }
    const vaultSecret = BigNumber.from(vault?.secret ?? source?.secret).toBigInt();

    const vaultNamespace = BigNumber.from(vault?.namespace ?? 0).toBigInt();
    const vaultIdentifier = vault?.namespace ? poseidon([vaultSecret, vaultNamespace]).toBigInt() : BigNumber.from(0).toBigInt();

    const mapArrayToBigInt = (arr: BigNumberish[]) =>
      arr.map((el) => BigNumber.from(el).toBigInt());

    const sourceIdentifier = BigNumber.from(source?.identifier ?? 0).toBigInt();
    let sourceCommitmentReceipt = [BigInt(0), BigInt(0), BigInt(0)];
    let sourceSecret = BigNumber.from(0).toBigInt();
    let sourceVaultNamespace = BigNumber.from(0).toBigInt();

    if (source && isSourceHydraS2Account(source)) {
      source = source as HydraS2Account & { verificationEnabled: boolean };
      sourceCommitmentReceipt = mapArrayToBigInt(source.commitmentReceipt);
      sourceSecret = BigNumber.from(source.secret).toBigInt();
    }
    if (source && !isSourceHydraS2Account(source)) {
      source = source as VaultAccount & { verificationEnabled: boolean };
      sourceVaultNamespace = BigNumber.from(source.namespace).toBigInt();
    }

    const destinationIdentifier = BigNumber.from(
      destination?.identifier ?? 0
    ).toBigInt();
    const destinationSecret = BigNumber.from(
      destination?.secret ?? 0
    ).toBigInt();
    const destinationCommitmentReceipt = destination?.commitmentReceipt
      ? mapArrayToBigInt(destination?.commitmentReceipt)
      : [BigInt(0), BigInt(0), BigInt(0)];
    const sourceSecretHash = poseidon([sourceSecret, 1]);
    const requestIdentifier = BigNumber.from(
      requestIdentifierInput ?? 0
    ).toBigInt();
    const proofIdentifier =
      requestIdentifier !== BigInt(0)
        ? poseidon([sourceSecretHash, requestIdentifier]).toBigInt()
        : BigInt(0);

    const claimValue = BigNumber.from(claim?.value ?? 0).toBigInt();
    // requestIdentifier = BigNumber.from(requestIdentifier ?? 0);

    const claimComparator =
      claim?.comparator === 1 ? BigInt(1) : BigInt(0);

    const sourceVerificationEnabled =
      source?.verificationEnabled === true ? BigInt(1) : BigInt(0);
    const destinationVerificationEnabled =
      destination?.verificationEnabled === true ? BigInt(1) : BigInt(0);

    const extraData = BigNumber.from(extraDataInput ?? 0).toBigInt();

    return {
      vaultSecret,
      vaultNamespace,
      vaultIdentifier,
      sourceVaultNamespace,
      sourceIdentifier,
      sourceSecret,
      sourceCommitmentReceipt,
      destinationIdentifier,
      destinationSecret,
      destinationCommitmentReceipt,
      requestIdentifier,
      claimValue,
      proofIdentifier,
      claimComparator,
      sourceVerificationEnabled,
      destinationVerificationEnabled,
      extraData: extraData,
    };
  }

  public async generateInputs({
    vault,
    source,
    destination,
    claim,
    requestIdentifier: requestIdentifierParam,
    extraData: extraDataInput,
  }: UserParams): Promise<Inputs> {
    const {
      vaultSecret,
      vaultNamespace,
      vaultIdentifier,
      sourceVaultNamespace,
      sourceIdentifier,
      sourceSecret,
      sourceCommitmentReceipt,
      destinationIdentifier,
      destinationSecret,
      destinationCommitmentReceipt,
      requestIdentifier,
      claimValue,
      proofIdentifier,
      claimComparator,
      sourceVerificationEnabled,
      destinationVerificationEnabled,
      extraData: extraData,
    } = await this.format({
      vault,
      source,
      destination,
      claim,
      requestIdentifier: requestIdentifierParam,
      extraData: extraDataInput,
    });

    const accountsTree = claim?.accountsTree;
    const registryTree = claim?.registryTree;

    if (accountsTree !== undefined && registryTree === undefined) {
      throw new Error("accountsTree and registryTree must be defined together");
    }

    const emptyMerklePath = {
      elements: new Array(ACCOUNTS_TREE_HEIGHT).fill(BigNumber.from(0)),
      indices: new Array(ACCOUNTS_TREE_HEIGHT).fill(0),
    };

    const mapArrayToBigInt = (arr: BigNumberish[]) =>
      arr.map((el) => BigNumber.from(el).toBigInt());

    const zeroPaddedSourceIdentifier = sourceVaultNamespace ? ethers.utils.hexlify(BigNumber.from(sourceIdentifier)) : ethers.utils.hexZeroPad(
        ethers.utils.hexlify(BigNumber.from(sourceIdentifier)),
        20
      );
  
    const accountMerklePath = accountsTree
        ? accountsTree.getMerklePathFromKey(zeroPaddedSourceIdentifier)
        : emptyMerklePath;
  
    const sourceValue = accountsTree
        ? accountsTree.getValue(zeroPaddedSourceIdentifier).toBigInt()
        : BigInt(0);

    const registryMerklePath: MerklePath = accountsTree
      ? registryTree!.getMerklePathFromKey(accountsTree.getRoot().toHexString())
      : emptyMerklePath;

    const accountsTreeValue = accountsTree
      ? registryTree!.getValue(accountsTree.getRoot().toHexString()).toBigInt()
      : BigInt(0);

    const accountsTreeRoot = accountsTree
      ? accountsTree.getRoot().toBigInt()
      : BigInt(0);

    const registryTreeRoot = registryTree
      ? registryTree.getRoot().toBigInt()
      : BigInt(0);

    const privateInputs: PrivateInputs = {
      vaultSecret,
      sourceIdentifier,
      sourceSecret,
      sourceVaultNamespace,
      sourceCommitmentReceipt,
      destinationSecret,
      destinationCommitmentReceipt,
      accountsTreeRoot,
      accountMerklePathElements: mapArrayToBigInt(accountMerklePath.elements),
      accountMerklePathIndices: accountMerklePath.indices,
      registryMerklePathElements: mapArrayToBigInt(registryMerklePath.elements),
      registryMerklePathIndices: registryMerklePath.indices,
      sourceValue,
    };

    const publicInputs: PublicInputs = {
      vaultNamespace,
      vaultIdentifier,
      destinationIdentifier,
      commitmentMapperPubKey: mapArrayToBigInt(this.commitmentMapperPubKey),
      registryTreeRoot: registryTreeRoot,
      requestIdentifier: requestIdentifier,
      proofIdentifier: proofIdentifier,
      claimValue: claimValue,
      accountsTreeValue: accountsTreeValue,
      claimComparator,
      sourceVerificationEnabled,
      destinationVerificationEnabled,
      extraData,
    };

    return {
      privateInputs,
      publicInputs,
    };
  }

  public async userParamsValidation({
    vault,
    source,
    destination,
    claim,
    requestIdentifier: requestIdentifierParam,
  }: UserParams) {
    const {
      vaultSecret,
      vaultIdentifier,
      sourceVaultNamespace,
      sourceIdentifier,
      sourceSecret,
      sourceCommitmentReceipt,
      destinationIdentifier,
      destinationSecret,
      destinationCommitmentReceipt,
      claimValue,
      proofIdentifier,
      claimComparator,
      sourceVerificationEnabled,
      destinationVerificationEnabled,
    } = await this.format({
      vault,
      source,
      destination,
      claim,
      requestIdentifier: requestIdentifierParam,
    });

    const accountsTree = claim?.accountsTree;
    if (accountsTree) {
      const registryTree = claim?.registryTree;
      if (!registryTree) {
        throw new Error(
          "Registry tree should be defined when the accountsTree is defined"
        );
      }
      try {
        registryTree.getValue(accountsTree.getRoot().toHexString());
      } catch (e) {
        throw new Error("Accounts tree root not found in the Registry tree");
      }

      const registryHeight = registryTree.getHeight();
      if (registryHeight != REGISTRY_TREE_HEIGHT)
        throw new Error("Invalid Registry tree height");

      const accountHeight = accountsTree.getHeight();
      if (accountHeight != ACCOUNTS_TREE_HEIGHT)
        throw new Error("Invalid Accounts tree height");

      let sourceValue;
      const zeroPaddedSourceIdentifier = sourceVaultNamespace ? ethers.utils.hexlify(BigNumber.from(sourceIdentifier)) : ethers.utils.hexZeroPad(
          ethers.utils.hexlify(BigNumber.from(sourceIdentifier)),
          20
        );

      try {
        sourceValue = accountsTree
          .getValue(zeroPaddedSourceIdentifier)
          .toBigInt();
      } catch (e) {
        throw new Error(
          `Could not find the source ${zeroPaddedSourceIdentifier} in the Accounts tree`
        );
      }

      if (claimValue > BigInt(sourceValue)) {
        throw new Error(
          `Claim value ${claimValue} can't be superior to Source value`
        );
      }

      if (claimValue < BigInt(0)) {
        throw new Error(`Claim value ${claimValue} can't be negative`);
      }

      if (claimComparator === BigInt(1) && claimValue !== sourceValue) {
        throw new Error(
          `Claim value ${claimValue} must be equal with Source value when claimComparator == 1`
        );
      }
    }

    if (sourceVerificationEnabled && isSourceHydraS2Account(source)) {
      const isSourceCommitmentValid = await verifyCommitment(
        sourceIdentifier,
        vaultSecret,
        sourceSecret,
        sourceCommitmentReceipt,
        this.commitmentMapperPubKey
      );
      if (!isSourceCommitmentValid)
        throw new Error("Invalid source commitment receipt");
    }

    if (sourceVerificationEnabled && !isSourceHydraS2Account(source)) {
      const poseidon = await buildPoseidon();
      const sourceVaultId = poseidon([vaultSecret, sourceVaultNamespace]);
      if (!sourceVaultId.eq(BigNumber.from(sourceIdentifier))) {
        throw new Error("Invalid source namespace");
      }
    }

    if (destinationVerificationEnabled) {
      const isDestinationCommitmentValid = await verifyCommitment(
        destinationIdentifier,
        vaultSecret,
        destinationSecret,
        destinationCommitmentReceipt,
        this.commitmentMapperPubKey
      );
      if (!isDestinationCommitmentValid)
        throw new Error("Invalid destination commitment receipt");
    }

    const SnarkField = SNARK_FIELD.toBigInt();
    if (proofIdentifier > SnarkField) {
      throw new Error(
        "ProodIdentifier overflow the snark field, please use request Identifier inside the snark field"
      );
    }
    if (vaultIdentifier > SnarkField) {
      throw new Error(
        "Vault identifier overflow the snark field, please use vault identifier inside the snark field"
      );
    }
    if (sourceIdentifier > SnarkField) {
      throw new Error(
        "Source identifier overflow the snark field, please use source identifier inside the snark field"
      );
    }
  }

  public async generateSnarkProof({
    vault,
    source,
    destination,
    claim,
    requestIdentifier,
    extraData,
  }: UserParams): Promise<SnarkProof> {
    await this.userParamsValidation({
      vault,
      source,
      destination,
      claim,
      requestIdentifier,
      extraData,
    });

    const { privateInputs, publicInputs } = await this.generateInputs({
      vault,
      source,
      destination,
      claim,
      requestIdentifier,
      extraData,
    });

    let files;
    if (process.env.MODULE_FORMAT == "esm" && this.esmOverrideCircuitPath) {
      files = this.esmOverrideCircuitPath;
    } else {
      files = {
        zkeyPath,
        wasmPath,
      };
    }

    const { proof, publicSignals } = await groth16.fullProve(
      { ...privateInputs, ...publicInputs },
      files.wasmPath,
      files.zkeyPath
    );

    return new SnarkProof(publicSignals, proof);
  }
}
