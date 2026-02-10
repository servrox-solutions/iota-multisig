// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { jwtDecode } from 'jwt-decode';
import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    jsonError,
    parseJson,
    requireAuthToken,
    zodErrorMessage,
} from '../_utils';
import { registry, z } from '../openapi-registry';

const upsertPublicKeySchema = z
    .object({
        publicKey: z.string().min(1).optional(),
    })
    .openapi({
        title: 'UpsertPublicKeyRequest',
        example: { publicKey: '...' },
    });

const upsertPublicKeyResponseSchema = z
    .object({ ok: z.literal(true) })
    .openapi({ title: 'UpsertPublicKeyResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/upsert-public-key',
    tags: ['write'],
    description: "Upsert the caller's public key.",
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: upsertPublicKeySchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Upserted.',
            content: {
                'application/json': { schema: upsertPublicKeyResponseSchema },
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

type UpsertPublicKeyResponse = z.infer<typeof upsertPublicKeyResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { publicKey } = await parseJson(upsertPublicKeySchema, req);
        const { sub } = jwtDecode<{ sub?: string }>(token);
        if (!sub) {
            return jsonError('Invalid token subject.', 401);
        }

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.from('owners').upsert({
            address: sub,
            public_key: publicKey,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError('Error storing public key for address.', 500);
        }

        const payload: UpsertPublicKeyResponse = { ok: true };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
