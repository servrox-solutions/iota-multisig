// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import {
    createSupabaseClientForToken,
    jsonError,
    requireAuthToken,
    zodErrorMessage,
} from '../_utils';
import { registry, z } from '../openapi-registry';

const vaultsOfCurrentUserResponseSchema = z
    .object({
        rows: z.array(z.unknown()).nullable(),
    })
    .openapi({ title: 'VaultsOfCurrentUserResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'get',
    path: '/api/vault/vaults',
    tags: ['read'],
    description: 'Fetch vaults for the current user.',
    security: [{ bearerAuth: [] }],
    responses: {
        200: {
            description: 'Vaults response.',
            content: {
                'application/json': { schema: vaultsOfCurrentUserResponseSchema },
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

type VaultsOfCurrentUserResponse = z.infer<typeof vaultsOfCurrentUserResponseSchema>;

export async function GET(req: Request) {
    try {
        const token = requireAuthToken(req);
        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.from('vaults_of_current_user').select('*');
        if (res?.error) {
            return jsonError('Could not fetch vaults for user.', 500);
        }
        const payload: VaultsOfCurrentUserResponse = { rows: res.data ?? null };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
