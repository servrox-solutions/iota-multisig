// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { NextResponse } from 'next/server';
import { generateOpenApiDocument } from '../openapi-registry';

// Ensure all routes are registered.
import '../add-whitelist-entry/route';
import '../auth/route';
import '../create-invitation/route';
import '../execute-transaction-data/route';
import '../propose-transaction/route';
import '../proposed-transactions/route';
import '../public-key/route';
import '../remove-whitelist-entry/route';
import '../respond-to-invitation/route';
import '../set-approval/route';
import '../upsert-public-key/route';
import '../vaults/route';

export async function GET() {
    return NextResponse.json(generateOpenApiDocument());
}
