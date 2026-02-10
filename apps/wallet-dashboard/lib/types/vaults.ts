import { Network } from '@iota/iota-sdk/client';

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
    whitelist: string[];
    creatorAddress: string;
    network: Network;
}
