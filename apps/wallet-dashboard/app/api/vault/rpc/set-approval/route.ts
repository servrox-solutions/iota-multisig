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

const setApprovalSchema = z
    .object({
        transactionId: z.number().int().positive(),
        signature: z.string().nullable().optional(),
    })
    .openapi({
        title: 'SetApprovalRequest',
        example: { transactionId: 1, signature: '0x...' },
    });

const setApprovalResponseSchema = z
    .object({ ok: z.literal(true) })
    .openapi({ title: 'SetApprovalResponse' });

const errorResponseSchema = z.object({ error: z.string() }).openapi({ title: 'ErrorResponse' });

registry.registerPath({
    method: 'post',
    path: '/api/vault/rpc/set-approval',
    description: 'Set approval for a proposed transaction.',
    security: [{ bearerAuth: [] }],
    request: {
        body: {
            content: {
                'application/json': { schema: setApprovalSchema },
            },
        },
    },
    responses: {
        200: {
            description: 'Approval set.',
            content: {
                'application/json': { schema: setApprovalResponseSchema },
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

type SetApprovalResponse = z.infer<typeof setApprovalResponseSchema>;

export async function POST(req: Request) {
    try {
        const token = requireAuthToken(req);
        const { transactionId, signature } = await parseJson(setApprovalSchema, req);

        const supabase = createSupabaseClientForToken(token);
        const res = await supabase.rpc('set_approval', {
            p_transaction_id: transactionId,
            p_signature: signature ?? null,
        });
        if (res?.error) {
            console.error(res.error);
            return jsonError(res.error.message, 500);
        }

        const payload: SetApprovalResponse = { ok: true };
        return NextResponse.json(payload);
    } catch (error) {
        const message = zodErrorMessage(error) ?? 'Unauthorized.';
        return jsonError(message, 401);
    }
}
