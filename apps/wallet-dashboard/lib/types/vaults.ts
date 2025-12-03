export interface Vault {
    vaultName: string;
    threshold: number;
    owners: {
        address: string;
        weight: number;
    }[];
    address: string;
}
