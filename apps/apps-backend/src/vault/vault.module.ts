// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Module } from '@nestjs/common';

import { SupabaseModule } from 'src/supabase/supabase.module';
import { VaultController } from './vault.controller';

@Module({
    imports: [SupabaseModule],
    controllers: [VaultController],
})
export class VaultModule {}
