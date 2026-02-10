// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { describe, expect, it, vi } from 'vitest';

function base64UrlEncode(input: object): string {
    return Buffer.from(JSON.stringify(input))
        .toString('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');
}

function createJwt(payload: object): string {
    const header = base64UrlEncode({ alg: 'none', typ: 'JWT' });
    const body = base64UrlEncode(payload);
    return `${header}.${body}.`;
}

describe('auth', () => {
    it('throws if config is missing', async () => {
        vi.resetModules();
        const { getVaultSdkConfig } = await import('../src/auth.js');
        expect(() => getVaultSdkConfig()).toThrow('Vault SDK not initialized');
    });

    it('returns configured values', async () => {
        vi.resetModules();
        const { initializeVaultSdk, getVaultSdkConfig } = await import('../src/auth.js');
        const onExpiredTokenUsage = vi.fn();
        initializeVaultSdk({
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon',
            onExpiredTokenUsage,
        });
        expect(getVaultSdkConfig().onExpiredTokenUsage).toBe(onExpiredTokenUsage);
    });

    it('creates an auth message with issuer + expiry', async () => {
        vi.resetModules();
        const { getAuthMessage } = await import('../src/auth.js');
        const exp = Date.now() + 60_000;
        const message = JSON.parse(Buffer.from(getAuthMessage(exp)).toString('utf8'));
        expect(message.iss).toBe('vault-login');
        expect(message.exp).toBe(exp);
    });

    it('validates tokens and extracts user', async () => {
        vi.resetModules();
        const { isTokenValid, authenticatedUser, initializeVaultSdk, setAuthToken } = await import(
            '../src/auth.js'
        );
        const now = Date.now();
        const validToken = createJwt({ exp: Math.floor((now + 60_000) / 1000), sub: 'user-1' });
        const expiredToken = createJwt({ exp: Math.floor((now - 60_000) / 1000), sub: 'user-2' });

        expect(isTokenValid(validToken)).toBe(true);
        expect(isTokenValid(expiredToken)).toBe(false);
        const storage = new Map<string, string>();
        initializeVaultSdk({
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon',
            storage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
        });
        setAuthToken(validToken);
        expect(authenticatedUser()).toBe('user-1');
    });

    it('uses provided storage and handles auth token lifecycle', async () => {
        vi.resetModules();
        const { initializeVaultSdk, getAuthToken, setAuthToken, clearAuthToken } = await import(
            '../src/auth.js'
        );
        const storage = new Map<string, string>();
        initializeVaultSdk({
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon',
            storage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
        });

        setAuthToken('token-1');
        expect(getAuthToken()).toBe('token-1');
        clearAuthToken();
        expect(getAuthToken()).toBeNull();
    });

    it('authenticates with signed message and stores token', async () => {
        vi.resetModules();
        const { initializeVaultSdk, authenticateWithSignedMessage, getAuthToken } = await import(
            '../src/auth.js'
        );
        const storage = new Map<string, string>();
        initializeVaultSdk({
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon',
            storage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
        });

        const token = await authenticateWithSignedMessage(
            { payloadBase64: 'payload', signature: 'sig' },
            async () => ({ authToken: 'auth-token' }),
        );

        expect(token).toBe('auth-token');
        expect(getAuthToken()).toBe('auth-token');
    });

    it('clears token and calls expired hook', async () => {
        vi.resetModules();
        const { initializeVaultSdk, handleExpiredToken, setAuthToken, getAuthToken } = await import(
            '../src/auth.js'
        );
        const storage = new Map<string, string>();
        const onExpiredTokenUsage = vi.fn();
        initializeVaultSdk({
            supabaseUrl: 'https://example.supabase.co',
            supabaseAnonKey: 'anon',
            onExpiredTokenUsage,
            storage: {
                getItem: (key) => storage.get(key) ?? null,
                setItem: (key, value) => storage.set(key, value),
                removeItem: (key) => storage.delete(key),
            },
        });

        setAuthToken('auth-token');
        handleExpiredToken();
        expect(getAuthToken()).toBeNull();
        expect(onExpiredTokenUsage).toHaveBeenCalledTimes(1);
    });
});
