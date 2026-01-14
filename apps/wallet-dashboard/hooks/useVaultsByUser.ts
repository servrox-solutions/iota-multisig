// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Vault } from '@/lib/types';
import { useSupabase } from '@/providers/SupabaseProvider';
import { Database } from '@/supabase/database.types';
import { Owner } from '@/supabase/json-types';
import { Ed25519PublicKey } from '@iota/iota-sdk/keypairs/ed25519';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { SupabaseClient } from '@supabase/supabase-js';
import { skipToken, useQuery } from '@tanstack/react-query';
import { MultiSigPublicKey } from '../../../sdk/typescript/dist/esm/multisig/publickey';

const vaultsByUser = async (supabase: SupabaseClient | null): Promise<Vault[] | null> => {
    if (!supabase) throw new Error('Supabase client not available.');

    // This view automatically filters by the user's address from the JWT
    const x = await supabase.from('vaults_of_current_user').select('*');
    if (x?.error !== null) {
        throw new Error('Could not fetch vaults for user.');
    }
    if (!x?.data) return null;
    const dbData = x.data as Database['public']['Views']['vaults_of_current_user']['Row'][];
    return dbData
        .map(
            (data) =>
                ({
                    id: data.id,
                    vaultName: data.name,
                    threshold: data.threshold,
                    address:
                        data.threshold &&
                        data.owners instanceof Array &&
                        (data.owners as unknown as Owner[]).every(
                            (owner) => owner.status === 'accepted' && !!owner.public_key,
                        )
                            ? MultiSigPublicKey.fromPublicKeys({
                                  threshold: data.threshold,
                                  publicKeys: (data.owners as unknown as Owner[]).map((owner) => ({
                                      publicKey: new Ed25519PublicKey(owner.public_key!),
                                      weight: owner.weight,
                                  })),
                              }).toIotaAddress()
                            : undefined,
                    owners: (data.owners as unknown as Owner[]).map((owner) => ({
                        address: owner.address,
                        weight: owner.weight,
                        status: owner.status,
                        publicKey: owner.public_key,
                    })),
                    creatorAddress: data.creator_address,
                    network: data.network,
                }) as Vault,
        )
        .sort((a, b) => {
            // 1️⃣ readiness
            const aReady = Boolean(a.address) && a.owners.every((o) => o.status === 'accepted');

            const bReady = Boolean(b.address) && b.owners.every((o) => o.status === 'accepted');

            if (aReady !== bReady) {
                return aReady ? -1 : 1;
            }

            // 2️⃣ name (readiness equal)
            const nameCompare = a.vaultName.localeCompare(b.vaultName);
            if (nameCompare !== 0) {
                return nameCompare;
            }

            // 3️⃣ address (names equal)
            const addressA = a.address ?? '';
            const addressB = b.address ?? '';
            const addressCompare = addressA.localeCompare(addressB);

            if (addressCompare !== 0) {
                return addressCompare;
            }

            // 4️⃣ equal
            return 0;
        });
};

// Returns all vaults for the current user.
// HINT: The provided userAddress is only used as a cache key; the actual data is fetched from the address in the supabase JWT token (subject)
export function useVaultsByUser(userAddress?: string) {
    const { client } = useSupabase();

    return useQuery({
        queryKey: ['vault', 'get-vaults-by-user', userAddress],
        queryFn:
            userAddress && isValidIotaAddress(userAddress)
                ? () => vaultsByUser(client())
                : skipToken,
        meta: { persist: true },
        // Always refetch because another user may have added a new vault or modified an existing one (e.g. accept/reject vault).
        // 1 Second stale time ensures de-duping of requests within 1 second.
        staleTime: 1000,
        enabled: !!userAddress && isValidIotaAddress(userAddress),
        // Refresh data all 60 seconds
        refetchInterval: 1000 * 60,
    });
}
