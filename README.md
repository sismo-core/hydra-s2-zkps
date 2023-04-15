<br />
<div align="center">
  <img src="https://static.sismo.io/readme/top-main.png" alt="Logo" width="150" height="150" style="borderRadius: 20px">

  <h3 align="center">
    Hydra-S2 ZKPS
  </h3>

  <p align="center">
    Hydra-S2 Zero-Knowledge Proving Scheme
  </p>

  <p align="center">
    Made by <a href="https://docs.sismo.io/" target="_blank">Sismo</a>
  </p>
  
  <p align="center">
    <a href="https://discord.gg/sismo" target="_blank">
        <img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white"/>
    </a>
    <a href="https://twitter.com/sismo_eth" target="_blank">
        <img src="https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white"/>
    </a>
  </p>
  <a href="https://www.sismo.io/" target="_blank"></a>
</div>

Hydra-S2 is an upgrade of the [Hydra-S1](https://github.com/sismo-core/hydra-s1-zkps) Zero-Knowledge Proving Scheme. The major update concerns the addition of the notion of a vault Identifier (vaultId) used in Sismo Connect.

Additionally, while Hydra-S1 only generates ZK Proofs from a Merkle tree storing groups of accounts with values (e.g group of ENS DAO voters where the account value is the number of votes), Hydra-S2 has a more modular approach. It is possible to only verify specific elements such as the Proof of Ownerships, the vaultId or only the inclusion of a specific account in a group for example.  

Therefore, Hydra-S2 enables users to generate ZK proofs for the following statements:
- Ownerships (optional): They own two accounts, a source account and a destination account. (the two are optional, it is possible to only verify the ownership of a single account, or neither of the two)
- Account inclusion (optional): Their source account is part of a group (we can choose to not check the Merkle proof)
- Account value (optional): Their source account holds a specific value 
- Vault Identifier Generation (optional): The vaultIdentifier is generated deterministically from the vault secret and vaultNamespace (an appId), and can be stored by apps to identify the owner of a specific vault for a specific application.
- Proof Identifier Generation (optional): The proofIdentifier is generated deterministically from the source account and a requestIdentifier. Proof verifiers can store it to ensure that only one ZK proof per account per requestIdentifier is accepted. A request identifier is deterministically generated from an appId, a groupId, a groupTimestamp and a namespace.

You can see additional details in the [Hydra-S2 documentation](https://docs.sismo.io/sismo-docs/technical-concepts/hydra-zk-proving-schemes/hydra-s2).

## Circuits and Package

Hydra-S2 Proving Scheme was developed using [circom](https://github.com/iden3/circom) and [snarkjs](https://github.com/iden3/snarkjs). This repo contains the circuits.

It outputs an off-chain prover and verifiers (both on-chain and off-chain).

Theses implementations of prover and verifiers are in the [@sismo-core/hydra-s2](./package) npm package.

```sh
$ yarn add @sismo-core/hydra-s2
```

## Installation

- Install [Circom2](https://docs.circom.io/getting-started/installation/) (rust version)
- Build

```sh
$ yarn build
```

## Test

```sh
$ yarn test 
$ test:circuits
$ test:verifier-js
$ test:verifier-contract
$ test:prover-js
```

## License

Distributed under the MIT License.

## Contribute

Please, feel free to open issues, PRs or simply provide feedback!

## Contact

Prefer [Discord](https://discord.gg/sismo) or [Twitter](https://twitter.com/sismo_eth)

<br/>
<img src="https://static.sismo.io/readme/bottom-main.png" alt="bottom" width="100%" >
