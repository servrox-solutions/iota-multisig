export interface Owner {
    address: string;
    weight: number;
    status: 'pending' | 'accepted' | 'rejected';
    public_key?: string;
}

export interface WhitelistEntry {
    address: string;
}
