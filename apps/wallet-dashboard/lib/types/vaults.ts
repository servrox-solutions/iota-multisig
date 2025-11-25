export interface PersistedVault {
    vaultName: string;
    threshold: number;
    owners: {
        address: string;
        weight: number;
    }[];
    address: string;
}

export type PersistVault = Omit<PersistedVault, 'address'>;
