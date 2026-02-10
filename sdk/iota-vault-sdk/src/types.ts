// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import type { SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

export type SupabaseClientMaybe = SupabaseClient | null | undefined;
export type SupabaseClientConfig = SupabaseClientOptions<'public'>;
