// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { toast } from '@iota/core';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface ProposeTransactionData {
    vaultId: number;
    transactionBinary: Uint8Array<ArrayBufferLike>;
    comment?: string;
    signature?: string;
}

const addProposedTransaction = async (
    client: SupabaseClient | null,
    { vaultId, transactionBinary, comment, signature }: ProposeTransactionData,
): Promise<number[]> => {
    if (!client) throw new Error('Supabase client not available.');
    // TODO: store signature in function
    const res = await client.rpc('propose_transaction', {
        p_vault_id: vaultId,
        p_transaction_data: transactionBinary,
        p_comment: comment,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data;
};

export const useStoreVaultTransaction = () => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: ProposeTransactionData) => {
            // TODO: use optimistic update;
            addProposedTransaction(client(), data);
        },
        onError: (error) => {
            toast.error('Transaction proposal failed.');
            console.error(error);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
    });
};
