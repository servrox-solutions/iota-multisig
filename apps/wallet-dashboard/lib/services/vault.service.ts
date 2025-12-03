export interface NewVault {
    vaultName: string;
    threshold: number;
    owners: {
        address: string;
        weight: number;
    }[];
}

export interface ExistingVault {
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
    createVault(vault: NewVault): Promise<ExistingVault>;
    getVaultByAddress(vaultAddress: string): Promise<ExistingVault>;
    getVaultsForAccountAddress(user: string): Promise<ExistingVault[]>;
}

export const VaultService: IVaultService = {
    createVault: (() => {}) as any,
    getVaultByAddress: (() => {}) as any,
    getVaultsForAccountAddress: (accountAddress: string): Promise<ExistingVault[]> => {
        return Promise.resolve([
            {
                vaultName: 'TestVault',
                threshold: 2,
                owners: [],
                address: '0x444b4c2822b213add43a0be6bbe5321ed34b56d1505de22c9ea042a8a2338945',
            },
        ]);
    },
};
