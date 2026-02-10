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

const vaultWhitelistQuerySchema = z
    .object({
        vaultId: z.coerce.number().int().positive(),
    })
    .openapi({ title: 'VaultWhitelistQuery', example: { vaultId: 1 } });

const vaultWhitelistResponseSchema = z
    .object({ data: z.array(z.unknown()) })
    .openapi({ title: 'VaultWhitelistResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'get',
    path: '/api/vault/rpc/vault-whitelist',
    description: 'Fetch whitelist entries for a vault.',
    security: [{ bearerAuth: [] }],
    request: {
        query: vaultWhitelistQuerySchema,
    },
    responses: {
        200: {
            description: 'Whitelist entries.',
            content: {
                'application/json': { schema: vaultWhitelistResponseSchema },
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

type VaultWhitelistResponse = z.infer<typeof vaultWhitelistResponseSchema>;

export async function GET(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { searchParams } = new URL(req.url);
        const { vaultId } = parseQuery(vaultWhitelistQuerySchema, searchParams);

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('get_vault_whitelist', { p_vault_id: vaultId });
        if (res?.error) {
            console.error(res.error);
            return jsonError('Could not fetch whitelist entries.', 500);
        }

        const payload: VaultWhitelistResponse = { data: (res.data as unknown[]) ?? [] };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
