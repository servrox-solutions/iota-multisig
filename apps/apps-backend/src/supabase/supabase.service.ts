// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { generateAuthToken } from '@iota/core/supabase/genererateAuthToken';
import { Injectable } from '@nestjs/common';

@Injectable()
export class SupabaseService {
    async generateSupabaseJwtToken(
        payload: Record<string, string | number>,
        privateKey: string,
    ): Promise<string> {
        return generateAuthToken(payload, privateKey).authToken;
    }
}
