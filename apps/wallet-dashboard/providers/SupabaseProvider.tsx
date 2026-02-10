// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { generateSupabaseJwt } from '@/actions/generateSupabaseJwt';
import {
    authenticateWithSignedMessage,
    authenticatedUser as getAuthenticatedUser,
    isAuthenticated as getIsAuthenticated,
    getVaultDefaultClient,
    initializeVaultSdk,
    resetVaultSupabaseClient,
    disconnect as sdkDisconnect,
    SupabaseClientMaybe,
    type SignedMessage,
} from 'iota-vault-sdk';
import { createContext, useContext, useEffect, type ReactNode } from 'react';

export interface SupabaseContextInterface {
    authenticate: (signedMessage: SignedMessage) => Promise<void>;
    client: () => SupabaseClientMaybe;
    disconnect: () => void;
    authenticatedUser: () => string | null;
    isAuthenticated: () => boolean;
}

export const SupabaseContext = createContext<SupabaseContextInterface | null>(null);

export type SupabaseProviderProps = {
    children: ReactNode;
    onExpiredTokenUsage: () => void;
};

export const useSupabase = () => {
    const context = useContext(SupabaseContext);
    if (!context) {
        throw new Error('useSupabase must be used within a SupabaseProvider');
    }
    return context;
};

export function SupabaseProvider({ children, onExpiredTokenUsage }: SupabaseProviderProps) {
    const authenticate = async (signedMessage: SignedMessage) => {
        await authenticateWithSignedMessage(signedMessage, generateSupabaseJwt);
        resetVaultSupabaseClient();
    };

    useEffect(() => {
        initializeVaultSdk({
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
            supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            onExpiredTokenUsage,
        });
    }, []);

    const client = () => getVaultDefaultClient();
    const authenticatedUser = () => getAuthenticatedUser();
    const isAuthenticated = () => getIsAuthenticated();

    const disconnect = () => {
        sdkDisconnect();
        resetVaultSupabaseClient();
    };

    return (
        <SupabaseContext.Provider
            value={{
                isAuthenticated,
                authenticate,
                authenticatedUser,
                disconnect,
                client,
            }}
        >
            {children}
        </SupabaseContext.Provider>
    );
}
