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
import { getExecuteTransactionData } from 'iota-vault-sdk';

const executeTransactionDataBodySchema = z
    .object({
        proposedTransactionId: z.number().int().positive(),
    })
    .openapi({
        title: 'ExecuteTransactionDataRequest',
        example: { proposedTransactionId: 1 },
    });

const executeTransactionDataResponseSchema = z
    .object({ data: z.unknown() })
    .openapi({ title: 'ExecuteTransactionDataResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/execute-transaction-data',
    tags: ['write'],
    description: 'Fetch execute transaction data.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: executeTransactionDataBodySchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Transaction data.',
            content: {
                'application/json': { schema: executeTransactionDataResponseSchema },
            },
        },
        401: {
            description: 'Unauthorized.',
            content: {
                'application/json': { schema: errorResponseSchema },
            },
        },
        404: {
            description: 'Not found.',
            content: {
                'application/json': { schema: errorResponseSchema },
            },
        },
    },
});

type ExecuteTransactionDataResponse = z.infer<typeof executeTransactionDataResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { proposedTransactionId } = await parseJson(executeTransactionDataBodySchema, req);

        ensureVaultSdkInitialized();
        const supabase = createSupabaseClientForToken(token);
        let data;
        try {
            data = await getExecuteTransactionData(
                {
                    proposedTransactionId,
                },
                supabase,
            );
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            if (message === 'No transaction data available.') {
                return jsonError(message, 404);
            }
            return jsonError(message, 500);
        }

        const payload: ExecuteTransactionDataResponse = { data };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
