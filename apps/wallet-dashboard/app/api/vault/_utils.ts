// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

export function jsonError(message: string, status = 400) {
    return NextResponse.json({ error: message }, { status });
}

export function getAuthToken(req: Request): string | null {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return null;
    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
    return token;
}

export function requireAuthToken(req: Request): string {
    const token = getAuthToken(req);
    if (!token) {
        throw new Error('Missing Authorization header.');
    }
    return token;
}

export function createSupabaseClientForToken(token: string): SupabaseClient {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Supabase environment variables missing.');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });
}

export function parseQuery<T extends z.ZodTypeAny>(schema: T, query: URLSearchParams): z.infer<T> {
    const data = Object.fromEntries(query.entries());
    return schema.parse(data);
}

export async function parseJson<T extends z.ZodTypeAny>(
    schema: T,
    req: Request,
): Promise<z.infer<T>> {
    const body = await req.json();
    return schema.parse(body);
}

export function zodErrorMessage(error: unknown): string {
    if (error instanceof z.ZodError) {
        return error.issues.map((issue) => issue.message).join('; ');
    }
    return error instanceof Error ? error.message : 'Invalid request.';
}
