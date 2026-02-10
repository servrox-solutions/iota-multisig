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

const executeTransactionDataQuerySchema = z
    .object({
        proposedTransactionId: z.coerce.number().int().positive(),
    })
    .openapi({
        title: 'ExecuteTransactionDataQuery',
        example: { proposedTransactionId: 1 },
    });

const executeTransactionDataResponseSchema = z
    .object({ data: z.unknown() })
    .openapi({ title: 'ExecuteTransactionDataResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'get',
    path: '/api/vault/rpc/execute-transaction-data',
    description: 'Fetch execute transaction data.',
    security: [{ bearerAuth: [] }],
    request: {
        query: executeTransactionDataQuerySchema,
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

export async function GET(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { searchParams } = new URL(req.url);
        const { proposedTransactionId } = parseQuery(
            executeTransactionDataQuerySchema,
            searchParams,
        );

        const supabase = createSupabaseClientForToken(token);
        const { data, error } = await supabase
            .rpc('get_execute_transaction_data', {
                p_proposed_transaction_id: proposedTransactionId,
            })
            .maybeSingle();

        if (error) {
            return jsonError(error.message, 500);
        }
        if (!data) {
            return jsonError('No transaction data available.', 404);
        }

        const payload: ExecuteTransactionDataResponse = { data };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
