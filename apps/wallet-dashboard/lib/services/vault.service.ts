export interface Vault {
    vaultName: string;
    threshold: number;
    address: string;
    owners: {
        address: string;
        publicKey: string;
        weight: number;
    }[];
}

export interface IVaultService {
    createVault(vault: Vault): Promise<void>;
    getVaultByAddress(vaultAddress: string): Promise<Vault>;
    getVaultsForAccountAddress(user: string): Promise<Vault[]>;
}

const vaults = [
    {
        vaultName: 'TestVault',
        threshold: 2,
        owners: [],
        address: '0x444b4c2822b213add43a0be6bbe5321ed34b56d1505de22c9ea042a8a2338945',
    },
] as any[];

export const VaultService: IVaultService = {
    createVault: async (vault: Vault) => {
        vaults.push(vault);
    },
    getVaultByAddress: (() => {}) as any,
    getVaultsForAccountAddress: (accountAddress: string): Promise<Vault[]> => {
        return Promise.resolve(vaults);
    },
};
