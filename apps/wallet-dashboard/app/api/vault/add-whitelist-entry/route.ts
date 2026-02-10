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

const whitelistEntrySchema = z
    .object({
        vaultId: z.number().int().positive(),
        address: z.string().min(1),
    })
    .openapi({
        title: 'WhitelistEntryRequest',
        example: { vaultId: 1, address: '0x...' },
    });

const whitelistEntryResponseSchema = z
    .object({ ok: z.literal(true) })
    .openapi({ title: 'WhitelistEntryResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/add-whitelist-entry',
    tags: ['write'],
    description: 'Add a whitelist entry.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: whitelistEntrySchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Added.',
            content: {
                'application/json': { schema: whitelistEntryResponseSchema },
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

type WhitelistEntryResponse = z.infer<typeof whitelistEntryResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { vaultId, address } = await parseJson(whitelistEntrySchema, req);

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('add_vault_whitelist_entry', {
            p_vault_id: vaultId,
            p_address: address,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError(res.error.message, 500);
        }

        const payload: WhitelistEntryResponse = { ok: true };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
