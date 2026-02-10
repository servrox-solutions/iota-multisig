// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import { generateOpenApiDocument } from '../openapi-registry';

// Ensure all routes are registered.
import '../auth/route';
import '../queries/proposed-transactions/route';
import '../queries/public-key/route';
import '../queries/upsert-owner/route';
import '../queries/vaults-of-current-user/route';
import '../rpc/add-vault-whitelist-entry/route';
import '../rpc/create-vault-invitation/route';
import '../rpc/execute-transaction-data/route';
import '../rpc/propose-transaction/route';
import '../rpc/remove-vault-whitelist-entry/route';
import '../rpc/respond-to-vault-invitation/route';
import '../rpc/set-approval/route';
import '../rpc/vault-whitelist/route';

export async function GET() {
    return NextResponse.json(generateOpenApiDocument());
}
