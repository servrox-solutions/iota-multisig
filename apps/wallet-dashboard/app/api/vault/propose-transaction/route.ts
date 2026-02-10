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
import { proposeTransaction } from 'iota-vault-sdk';

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

        ensureVaultSdkInitialized();
        const supabase = createSupabaseClientForToken(token);
        const data = await proposeTransaction(
            {
                vaultId,
                transactionData,
                comment,
                signature,
            },
            supabase,
        );

        const payload: ProposeTransactionResponse = { data: data ?? [] };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
