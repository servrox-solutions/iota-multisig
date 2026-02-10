// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { generateSupabaseJwt } from '@/actions/generateSupabaseJwt';
import { NextResponse } from 'next/server';
import { jsonError, parseJson, zodErrorMessage } from '../_utils';
import { registry, z } from '../openapi-registry';

const authRequestSchema = z
    .object({
        payloadBase64: z.string().min(1),
        signature: z.string().min(1),
    })
    .openapi({
        title: 'AuthRequest',
        example: { payloadBase64: 'BASE64', signature: '0x...' },
    });

const authResponseSchema = z
    .object({
        authToken: z.string().min(1),
    })
    .openapi({
        title: 'AuthResponse',
    });

const errorResponseSchema = z
    .object({
        error: z.string(),
    })
    .openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/auth',
    tags: ['auth'],
    description: 'Exchange a signed message for a Supabase JWT.',
    request: {
        body: {
            content: {
                'application/json': {
                    schema: authRequestSchema,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'JWT issued.',
            content: {
                'application/json': {
                    schema: authResponseSchema,
                },
            },
        },
        401: {
            description: 'Unauthorized.',
            content: {
                'application/json': {
                    schema: errorResponseSchema,
                },
            },
        },
    },
});

type AuthResponse = z.infer<typeof authResponseSchema>;

export async function POST(req: Request) {
    try {
        const { payloadBase64, signature } = await parseJson(authRequestSchema, req);

        const { authToken } = await generateSupabaseJwt({ payloadBase64, signature });
        const payload: AuthResponse = { authToken };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Authentication failed.';
        return jsonError(message, 401);
    }
}
