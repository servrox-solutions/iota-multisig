export interface Vault {
    id: number;
    address?: string;
    vaultName: string;
    threshold: number;
    owners: {
        address: string;
        weight: number;
        status: 'pending' | 'accepted' | 'rejected';
        publicKey?: string;
    }[];
    creatorAddress: string;
}
