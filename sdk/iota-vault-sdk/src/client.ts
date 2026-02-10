// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { createClient } from '@supabase/supabase-js';
import { getAuthToken, getVaultSdkConfig, handleExpiredToken, isTokenValid } from './auth.js';
import type { SupabaseClientMaybe } from './types.js';

let cachedClient: SupabaseClientMaybe = null;
let cachedToken: string | null = null;

export function getVaultDefaultClient(): SupabaseClientMaybe {
    const token = getAuthToken();
    if (!isTokenValid(token)) {
        handleExpiredToken();
        return null;
    }

    if (cachedClient && cachedToken === token) {
        return cachedClient;
    }

    const { supabaseUrl, supabaseAnonKey, supabaseConfig } = getVaultSdkConfig();

    // If the user/auth changes, this triggers multiple instances of Supabase in the FE,
    // which leads to a warning. However, it's currently not easily possible to get rid
    // of an instance or change the Authorization header of the existing one.
    const client = createClient(supabaseUrl, supabaseAnonKey, {
        ...supabaseConfig,
        global: {
            ...supabaseConfig?.global,
            headers: {
                ...(supabaseConfig?.global?.headers ?? {}),
                Authorization: `Bearer ${token}`,
            },
        },
    });

    cachedClient = client;
    cachedToken = token;

    return cachedClient;
}

export function resetVaultSupabaseClient(): void {
    cachedClient = null;
    cachedToken = null;
}
