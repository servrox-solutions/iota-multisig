// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0
'use client';

import { VaultGuard } from '@/components/vault-guard';
import { type PropsWithChildren } from 'react';

function VaultLayout({ children }: PropsWithChildren): JSX.Element {
    return <VaultGuard>{children}</VaultGuard>;
}

export default VaultLayout;
