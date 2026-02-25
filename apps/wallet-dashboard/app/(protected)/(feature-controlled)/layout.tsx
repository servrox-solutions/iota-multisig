// Copyright (c) 2025 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import { MIGRATION_ROUTE, VAULT_ROUTE, VESTING_ROUTE } from '@/lib/constants/routes.constants';
import { useFeature } from '@growthbook/growthbook-react';
import { Feature } from '@iota/core';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';

const PATH_TO_FEATURE_MAP = {
    [MIGRATION_ROUTE.path]: Feature.StardustMigration,
    [VESTING_ROUTE.path]: Feature.SupplyIncreaseVesting,
};

export default function FeatureProtectedRoutesLayout({ children }: React.PropsWithChildren) {
    const pathname = usePathname();
    const router = useRouter();
    const featureIdentifier = PATH_TO_FEATURE_MAP[pathname];
    const isEnabled = useFeature<boolean>(featureIdentifier).value;

    useEffect(() => {
        if (!isEnabled) {
            router.push(VAULT_ROUTE.path);
        }
    }, [router, isEnabled]);

    return isEnabled ? <>{children}</> : null;
}
