// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { toast } from '@iota/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface SetApprovalData {
    proposedTransactionId: number;
    signature: string | null;
}

const setApproval = async (
    client: SupabaseClient | null,
    { proposedTransactionId, signature }: SetApprovalData,
): Promise<number[]> => {
    if (!client) throw new Error('Supabase client not available.');
    console.log(signature);

    // TODO: store signature in function
    const res = await client.rpc('set_approval', {
        p_transaction_id: proposedTransactionId,
        p_signature: signature,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error(res.error.message);
    }
    return res.data;
};

export const useSetApproval = () => {
    const { client } = useSupabase();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: SetApprovalData) => {
            // TODO: use optimistic update;
            setApproval(client(), data);
        },
        onError: (error) => {
            toast.error('Transaction proposal failed.');
            console.error(error);
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
    });
};
