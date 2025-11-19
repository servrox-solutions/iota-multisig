import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { PersistVault } from '../types/vaults';
import { MultiSigPublicKey } from '../../../../sdk/typescript/dist/esm/multisig/publickey';

export const vaultIdentifier = (vault: PersistVault) =>
    `${vault.threshold}:${vault.publicKeys.sort((x, y) => y.publicKey.localeCompare(x.publicKey)).map((s) => `${s.publicKey}:${s.weight}`)}`;

export const deserializeVault = (
    vault: PersistVault,
): Parameters<typeof MultiSigPublicKey.fromPublicKeys>[0] => {
    return {
        ...vault,
        publicKeys: vault.publicKeys.map((publicKey) => ({
            ...publicKey,
            publicKey: new Ed25519PublicKey(publicKey.publicKey),
        })),
    };
};
