// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    jsonError,
    parseJson,
    requireAuthToken,
    zodErrorMessage,
} from '../_utils';
import { registry, z } from '../openapi-registry';

const respondToVaultInvitationSchema = z
    .object({
        vaultId: z.number().int().positive(),
        status: z.string().min(1),
    })
    .openapi({
        title: 'RespondToVaultInvitationRequest',
        example: { vaultId: 1, status: 'accepted' },
    });

const respondToVaultInvitationResponseSchema = z
    .object({ ok: z.literal(true) })
    .openapi({ title: 'RespondToVaultInvitationResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/respond-to-invitation',
    tags: ['write'],
    description: 'Respond to a vault invitation.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: respondToVaultInvitationSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Response recorded.',
            content: {
                'application/json': { schema: respondToVaultInvitationResponseSchema },
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

type RespondToVaultInvitationResponse = z.infer<typeof respondToVaultInvitationResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { vaultId, status } = await parseJson(respondToVaultInvitationSchema, req);

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('respond_to_vault_invitation', {
            p_vault_id: vaultId,
            p_status: status,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError('Error storing public key for address.', 500);
        }

        const payload: RespondToVaultInvitationResponse = { ok: true };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
