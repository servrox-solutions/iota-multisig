import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { MultiSigPublicKey } from '../../../../sdk/typescript/dist/esm/multisig/publickey';
import { PersistVault } from '../types/vaults';

export const vaultIdentifier = (vault: PersistVault) =>
    `${vault.threshold}:${vault.owners.sort((x, y) => y.address.localeCompare(x.address)).map((s) => `${s.address}:${s.weight}`)}`;

export const deserializeVault = (
    vault: PersistVault,
): Parameters<typeof MultiSigPublicKey.fromPublicKeys>[0] => {
    return {
        ...vault,
        publicKeys: vault.owners.map((owner) => ({
            ...owner,
            publicKey: new Ed25519PublicKey(publicKey.publicKey),
        })),
    };
};
