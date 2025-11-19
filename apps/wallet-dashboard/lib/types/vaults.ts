export interface PersistedVault {
    vaultName: string;
    threshold: number;
    publicKeys: {
        publicKey: string;
        weight: number;
    }[];
    address: string;
}

export type PersistVault = Omit<PersistedVault, 'address'>;
