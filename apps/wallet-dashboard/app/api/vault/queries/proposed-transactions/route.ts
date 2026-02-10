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

const proposedTransactionsQuerySchema = z
    .object({
        vaultId: z.coerce.number().int().positive(),
        cursorId: z.coerce.number().int().positive().optional(),
        limit: z.coerce.number().int().positive().max(100).optional(),
        filter: z.enum(['pending', 'executed', 'declined']).optional(),
    })
    .openapi({
        title: 'ProposedTransactionsQuery',
        example: { vaultId: 1, limit: 10, filter: 'pending' },
    });

const proposedTransactionsResponseSchema = z
    .object({
        rows: z.array(z.unknown()),
        hasNext: z.boolean(),
        cursorId: z.number().int().nullable(),
    })
    .openapi({ title: 'ProposedTransactionsResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'get',
    path: '/api/vault/queries/proposed-transactions',
    description: 'Fetch proposed transactions for a vault.',
    security: [{ bearerAuth: [] }],
    request: {
        query: proposedTransactionsQuerySchema,
    },
    responses: {
        200: {
            description: 'Proposed transactions response.',
            content: {
                'application/json': { schema: proposedTransactionsResponseSchema },
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

type ProposedTransactionsResponse = z.infer<typeof proposedTransactionsResponseSchema>;

export async function GET(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { searchParams } = new URL(req.url);
        const { vaultId, cursorId, limit = 10, filter = 'pending' } = parseQuery(
            proposedTransactionsQuerySchema,
            searchParams,
        );

        const supabase = createSupabaseClientForToken(token);
        let query = supabase
            .from('proposed_transactions_of_current_user')
            .select('*')
            .eq('vault_id', vaultId)
            .limit(limit + 1);

        if (filter === 'executed') {
            query = query.not('transaction_digest', 'is', null).order('executed_at', {
                ascending: false,
            });
        }

        if (filter === 'declined') {
            query = query.not('declined_at', 'is', null).order('declined_at', {
                ascending: false,
            });
        }

        if (filter === 'pending') {
            query = query
                .is('transaction_digest', null)
                .is('declined_at', null)
                .order('created_at', {
                    ascending: false,
                });
        }

        if (cursorId !== undefined) {
            query = query.lt('id', cursorId);
        }

        const result = await query;
        if (result?.error) {
            return jsonError(`Could not fetch proposed transactions for vault ${vaultId}.`, 500);
        }

        const rows = result.data ?? [];
        const hasNext = rows.length > limit;
        const limitedRows = hasNext ? rows.slice(0, -1) : rows;
        const newCursorId = limitedRows.length > 0 ? limitedRows[limitedRows.length - 1].id : null;

        const payload: ProposedTransactionsResponse = {
            rows: limitedRows,
            hasNext,
            cursorId: newCursorId,
        };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
