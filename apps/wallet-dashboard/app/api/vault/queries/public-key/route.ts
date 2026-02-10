// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    jsonError,
    parseQuery,
    requireAuthToken,
    zodErrorMessage,
} from '../../_utils';
import { registry, z } from '../../openapi-registry';

const publicKeyQuerySchema = z
    .object({
        address: z.string().min(1),
    })
    .openapi({
        title: 'PublicKeyQuery',
        example: { address: '0x...' },
    });

const publicKeyResponseSchema = z
    .object({
        publicKey: z.string().nullable(),
    })
    .openapi({ title: 'PublicKeyResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'get',
    path: '/api/vault/queries/public-key',
    tags: ['queries'],
    description: 'Fetch a public key by address.',
    security: [{ bearerAuth: [] }],
    request: {
        query: publicKeyQuerySchema,
    },
    responses: {
        200: {
            description: 'Public key response.',
            content: {
                'application/json': { schema: publicKeyResponseSchema },
            },
        },
        401: {
            description: 'Unauthorized.',
            content: {
                'application/json': { schema: errorResponseSchema },
            },
        },
    },
});

type PublicKeyResponse = z.infer<typeof publicKeyResponseSchema>;

export async function GET(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { searchParams } = new URL(req.url);
        const { address } = parseQuery(publicKeyQuerySchema, searchParams);

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase
            .from('owners')
            .select('public_key')
            .eq('address', address)
            .single();
        if (res?.error) {
            return jsonError('Could not fetch public key for address.', 500);
        }
        const payload: PublicKeyResponse = { publicKey: res.data?.public_key ?? null };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
