// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { VaultDetailsPageClient } from './vault-details-page-client';

type PageProps = {
    params: Promise<{ 'vault-id': string }>;
};

export default async function VaultDetailsPage({ params }: PageProps): Promise<JSX.Element> {
    const { 'vault-id': vaultId } = await params;

    return <VaultDetailsPageClient vaultId={vaultId} />;
}
