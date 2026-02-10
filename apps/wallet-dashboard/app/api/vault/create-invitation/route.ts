// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    ensureVaultSdkInitialized,
    jsonError,
    parseJson,
    requireAuthToken,
    zodErrorMessage,
} from '../_utils';
import { registry, z } from '../openapi-registry';
import { createVaultInvitation } from 'iota-vault-sdk';

const createVaultInvitationSchema = z
    .object({
        users: z.unknown(),
        threshold: z.number().int().positive(),
        name: z.string().min(1),
        networks: z.array(z.string().min(1)).min(1),
    })
    .openapi({
        title: 'CreateVaultInvitationRequest',
        example: {
            users: ['0x00'],
            threshold: 2,
            name: 'Vault',
            networks: ['testnet', 'mainnet', 'devnet'],
        },
    });

const createVaultInvitationResponseSchema = z
    .object({
        data: z.array(z.number().int()),
    })
    .openapi({ title: 'CreateVaultInvitationResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/create-invitation',
    tags: ['write'],
    description: 'Create a vault invitation.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: createVaultInvitationSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Created.',
            content: {
                'application/json': { schema: createVaultInvitationResponseSchema },
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

type CreateVaultInvitationResponse = z.infer<typeof createVaultInvitationResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { users, threshold, name, networks } = await parseJson(
            createVaultInvitationSchema,
            req,
        );

        ensureVaultSdkInitialized();
        const supabase = createSupabaseClientForToken(token);
        const data = await createVaultInvitation(
            {
                users,
                threshold,
                name,
                networks,
            },
            supabase,
        );

        const payload: CreateVaultInvitationResponse = { data: data ?? [] };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
