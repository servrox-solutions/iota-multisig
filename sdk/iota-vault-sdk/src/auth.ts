// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { jwtDecode } from 'jwt-decode';
import type { SupabaseClientConfig } from './types.js';

export interface AuthPayload {
    iss: 'vault-login';
    exp: number;
}

export interface SignedMessage {
    payloadBase64: string;
    signature: string;
}

export type AuthTokenProvider = (signedMessage: SignedMessage) => Promise<{ authToken: string }>;

export interface StorageLike {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
    removeItem: (key: string) => void;
}

export interface VaultSdkConfig {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseConfig?: SupabaseClientConfig;
    onExpiredTokenUsage?: () => void;
    storage?: StorageLike;
}

const DEFAULT_TOKEN_KEY = 'jwt_supabase';

let config: VaultSdkConfig | null = null;

export function initializeVaultSdk(nextConfig: VaultSdkConfig): void {
    config = nextConfig;
}

export function getVaultSdkConfig(): VaultSdkConfig {
    if (!config) {
        throw new Error('Vault SDK not initialized. Call initializeVaultSdk first.');
    }
    return config;
}

export function getAuthMessage(exp = Date.now() + 10 * 60 * 1000): Uint8Array {
    const message = {
        iss: 'vault-login',
        exp,
    } satisfies AuthPayload;
    return new TextEncoder().encode(JSON.stringify(message));
}

export function getStorage(): StorageLike {
    const { storage } = getVaultSdkConfig();
    if (storage) return storage;
    if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage;
    }
    return {
        getItem: () => null,
        setItem: () => undefined,
        removeItem: () => undefined,
    };
}

export function getAuthToken(): string | null {
    return getStorage().getItem(DEFAULT_TOKEN_KEY);
}

export function setAuthToken(token: string): void {
    getStorage().setItem(DEFAULT_TOKEN_KEY, token);
}

export function clearAuthToken(): void {
    getStorage().removeItem(DEFAULT_TOKEN_KEY);
}

export function isTokenValid(token: string | null): boolean {
    if (!token) return false;
    try {
        const { exp } = jwtDecode<{ exp?: number }>(token);
        if (!exp || exp * 1000 < Date.now()) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

export function authenticatedUser(): string | null {
    const token = getAuthToken();
    if (!isTokenValid(token)) return null;
    try {
        const { sub } = jwtDecode<{ sub?: string }>(token!);
        return sub ?? null;
    } catch {
        return null;
    }
}

export function isAuthenticated(): boolean {
    return authenticatedUser() !== null;
}

export async function authenticateWithSignedMessage(
    signedMessage: SignedMessage,
    getAuthTokenFromServer: AuthTokenProvider,
): Promise<string> {
    const { authToken } = await getAuthTokenFromServer(signedMessage);
    setAuthToken(authToken);
    return authToken;
}

export function disconnect(): void {
    clearAuthToken();
}

export function handleExpiredToken(): void {
    const { onExpiredTokenUsage } = getVaultSdkConfig();
    clearAuthToken();
    onExpiredTokenUsage?.();
}
