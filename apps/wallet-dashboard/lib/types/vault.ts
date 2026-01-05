export interface Vault {
    vaultName: string;
    threshold: number;
    address: string;
    owners: {
        address: string;
        publicKey: string;
        weight: number;
    }[];
    creatorAddress: string;
    ownerApprovals: {
        address: string;
        approval: 'pending' | 'accepted' | 'rejected';
    }[];
}
