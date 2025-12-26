// Copyright (c) Mysten Labs, Inc.
// Modifications Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { generateSupabaseJwt } from '@/actions/generateSupabaseJwt';
import { Database } from '@/supabase/database.types';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtDecode } from 'jwt-decode';
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';

export interface SignedMessage {
    payloadBase64: string;
    signature: string;
}

export interface SupabaseContextInterface {
    authenticate: (signedMessage: SignedMessage) => Promise<void>;
    client: () => SupabaseClient | null;
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
    const supabaseClient = useRef<SupabaseClient<Database> | null>(null);

    const authenticate = async (signedMessage: SignedMessage) => {
        const { authToken } = await generateSupabaseJwt(signedMessage);
        setAuthToken(authToken);
        initClient();
    };

    const initClient = () => {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        // We should only have one single client, but it's not possible to change the
        // Authorization header of an instantiated client; Thus, we need to create a new one.
        // This causes warnings in the console.
        const client = createClient<Database>(supabaseUrl!, supabaseKey!, {
            global: {
                headers: {
                    Authorization: `Bearer ${authToken()}`,
                },
            },
        });
        supabaseClient.current = client;
    };

    useEffect(() => {
        // Change this to useEffectEvent once available
        initClient();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const authToken = () => localStorage.getItem('jwt_supabase');
    const setAuthToken = (token: string) => localStorage.setItem('jwt_supabase', token);

    const client = () => {
        try {
            const token = authToken();
            if (!token) throw new Error('No auth token present');
            const { exp } = jwtDecode(token);
            if (!exp || exp * 1000 < Date.now()) {
                throw new Error('Token expired.');
            }
        } catch (err) {
            console.log(err);
            disconnect();
            onExpiredTokenUsage();
            return null;
        }

        return supabaseClient.current ?? null;
    };

    const authenticatedUser = () => {
        try {
            const token = authToken();
            if (!token) throw new Error('No auth token present');
            const { exp, sub } = jwtDecode(token);
            if (!exp || exp * 1000 < Date.now() || !sub) {
                throw new Error('Token expired.');
            }
            return sub;
        } catch (err) {
            disconnect();
            onExpiredTokenUsage();
            return null;
        }
    };

    const isAuthenticated = () => authenticatedUser() !== null;
    const disconnect = () => setAuthToken('');

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