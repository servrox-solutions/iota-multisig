// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useSupabase } from '@/providers/SupabaseProvider';
import { SupabaseClient } from '@supabase/supabase-js';
import { useMutation } from '@tanstack/react-query';

export interface AddUserData {
    address: string;
    publicKey: string;
}

const addUser = async (userData: AddUserData, client: SupabaseClient | null) => {
    if (!client) throw new Error('Supabase client not available.');
    const res = await client.from('owners').upsert({
        address: userData.address,
        public_key: userData.publicKey,
    });
    if (res?.error) {
        console.error(res.error);
        throw new Error('Error storing public key for address.');
    }
};

export const useAddVaultUser = () => {
    const { client } = useSupabase();
    return useMutation({
        mutationFn: (userData: AddUserData) => addUser(userData, client()),
    });
};
