// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { SupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface VaultInvitationResponse {
    vaultId: number;
    status: 'accepted' | 'rejected';
}

const respondToVaultInvitation = async (
    { vaultId, status }: VaultInvitationResponse,
    client: SupabaseClient | null,
) => {
    if (!client) throw new Error('Supabase client not available.');
    const res = await client.rpc('respond_to_vault_invitation', {
        p_vault_id: vaultId,
        p_status: status,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error('Error storing public key for address.');
    }
};

export const useVaultRespondInvitation = ({
    onSuccess,
}: {
    onSuccess?: (invitationResponse: VaultInvitationResponse) => void;
}) => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vaultInvitation: VaultInvitationResponse) =>
            respondToVaultInvitation(vaultInvitation, client()),
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
        onSuccess: (_, variables) => onSuccess?.(variables),
    });
};
