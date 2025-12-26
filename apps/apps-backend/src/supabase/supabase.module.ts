// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';
import { SupabaseService } from './supabase.service';

@Module({
    imports: [],
    providers: [SupabaseService],
    exports: [SupabaseService],
})
export class SupabaseModule {}
