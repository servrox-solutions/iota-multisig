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

const proposeTransactionSchema = z
    .object({
        vaultId: z.number().int().positive(),
        transactionData: z.string().min(1),
        comment: z.string().nullable().optional(),
        signature: z.string().nullable().optional(),
    })
    .openapi({
        title: 'ProposeTransactionRequest',
        example: { vaultId: 1, transactionData: '0xdeadbeef' },
    });

const proposeTransactionResponseSchema = z
    .object({ data: z.array(z.number().int()) })
    .openapi({ title: 'ProposeTransactionResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/propose-transaction',
    tags: ['write'],
    description: 'Propose a transaction.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: proposeTransactionSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Proposed.',
            content: {
                'application/json': { schema: proposeTransactionResponseSchema },
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

type ProposeTransactionResponse = z.infer<typeof proposeTransactionResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { vaultId, transactionData, comment, signature } = await parseJson(
            proposeTransactionSchema,
            req,
        );

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('propose_transaction', {
            p_vault_id: vaultId,
            p_transaction_data: transactionData,
            p_comment: comment ?? null,
            p_signature: signature ?? null,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError(res.error.message, 500);
        }

        const payload: ProposeTransactionResponse = { data: (res.data as number[]) ?? [] };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
