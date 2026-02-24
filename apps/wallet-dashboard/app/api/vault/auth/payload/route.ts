// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { getAuthMessage } from '@/lib/utils/supabase/auth.payload';
import { toB64 } from '@iota/iota-sdk/utils';
import { NextResponse } from 'next/server';
import { registry, z } from '../../openapi-registry';

const authPayloadResponseSchema = z
    .object({
        payloadBase64: z.string().min(1),
        payload: z.object({
            iss: z.literal('vault-login'),
            exp: z.number().int().positive(),
        }),
    })
    .openapi({
        title: 'AuthPayloadResponse',
        example: {
            payloadBase64: 'eyJpc3MiOiJ2YXVsdC1sb2dpbiIsImV4cCI6MTcwMDAwMDAwMDAwMH0=',
            iss: 'vault-login',
            exp: 1700000000000,
        },
    });

registry.registerPath({
    method: 'get',
    path: '/api/vault/auth/payload',
    tags: ['auth'],
    description: 'Get the auth payload to sign before exchanging it for a Supabase JWT.',
    responses: {
        200: {
            description: 'Auth payload.',
            content: {
                'application/json': {
                    schema: authPayloadResponseSchema,
                },
            },
        },
    },
});

type AuthPayloadResponse = z.infer<typeof authPayloadResponseSchema>;

export async function GET() {
    const message = getAuthMessage();
    const payload = JSON.parse(new TextDecoder().decode(message)) as {
        iss: 'vault-login';
        exp: number;
    };

    const response: AuthPayloadResponse = {
        payloadBase64: toB64(message),
        payload: {
            iss: payload.iss,
            exp: payload.exp,
        },
    };

    return NextResponse.json(response);
}
