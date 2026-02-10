// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    jsonError,
    parseJson,
    requireAuthToken,
    zodErrorMessage,
} from '../../_utils';
import { registry, z } from '../../openapi-registry';

const createVaultInvitationSchema = z
    .object({
        users: z.unknown(),
        threshold: z.number().int().positive(),
        name: z.string().min(1),
        networks: z.array(z.string().min(1)).min(1),
    })
    .openapi({
        title: 'CreateVaultInvitationRequest',
        example: { users: [], threshold: 2, name: 'Vault', networks: ['iota'] },
    });

const createVaultInvitationResponseSchema = z
    .object({
        data: z.array(z.number().int()),
    })
    .openapi({ title: 'CreateVaultInvitationResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/rpc/create-vault-invitation',
    tags: ['rpc'],
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

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('create_vault_invitation', {
            p_users: users,
            p_threshold: threshold,
            p_name: name,
            p_networks: networks,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError(res.error.message, 500);
        }

        const payload: CreateVaultInvitationResponse = { data: (res.data as number[]) ?? [] };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
