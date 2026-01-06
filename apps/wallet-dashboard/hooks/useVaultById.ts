// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { Owner } from '@/supabase/json-types';
import { useCurrentAccount } from '@iota/dapp-kit';
import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import { MultiSigPublicKey } from '../../../sdk/typescript/dist/esm/multisig/publickey';

const STALE_TIME = 10 * 60 * 1000;

const vaultById = async (id: number, supabase: SupabaseClient | null): Promise<Vault | null> => {
    if (!supabase) throw new Error('Supabase client not available.');

    const x = await supabase.from('vaults_of_current_user').select('*').eq('id', id).maybeSingle();
    if (x?.error !== null) {
        throw new Error('Could not fetch vault at address.');
    }
    if (!x?.data) return null;
    const dbData = x.data as Database['public']['Views']['vaults_of_current_user']['Row'];
    const owners = dbData.owners as unknown as Owner[];
    return {
        id: dbData.id,
        vaultName: dbData.name,
        threshold: dbData.threshold,
        address:
            dbData.threshold &&
            dbData.owners instanceof Array &&
            owners.every((owner) => owner.status === 'accepted' && !!owner.public_key)
                ? MultiSigPublicKey.fromPublicKeys({
                      threshold: dbData.threshold,
                      publicKeys: owners.map((owner) => ({
                          publicKey: new Ed25519PublicKey(owner.public_key!),
                          weight: owner.weight,
                      })),
                  }).toIotaAddress()
                : undefined,
        owners: (dbData.owners as unknown as Owner[]).map((owner) => ({
            address: owner.address,
            weight: owner.weight,
            status: owner.status,
            publicKey: owner.public_key,
        })),
        creatorAddress: dbData.creator_address,
    } as Vault;
};

export function useVaultById(vaultId: number) {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    const account = useCurrentAccount();

    return useQuery({
        queryKey: ['vault', 'get-vault-by-id', vaultId],
        queryFn: vaultId ? () => vaultById(vaultId, client()) : skipToken,
        meta: { persist: true },
        // prefill initial data from the vault list
        initialData: () =>
            (
                queryClient.getQueryData([
                    'vault',
                    'get-vaults-by-user',
                    account?.address,
                ]) as Vault[]
            )?.find((vault: Vault) => vault.id === vaultId),
        staleTime: ({ state: { data } }) => (data === null ? 0 : STALE_TIME),
    });
}
