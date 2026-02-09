// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMemo } from 'react';
import { useMultiGetObjects } from '@iota/core';
import { Transaction } from '@iota/iota-sdk/transactions';
import { getTransactionObjectInputVersions } from '@/lib/utils/transaction';

export interface DeprecatedTransactionObject {
    objectId: string;
    expectedVersion: string;
    latestVersion: string | null;
}

export function useDeprecatedTransactionObjects(transaction?: Transaction | null): {
    deprecatedObjects: DeprecatedTransactionObject[];
    isLoading: boolean;
} {
    const objectInputs = useMemo(() => {
        if (!transaction) return [];
        return getTransactionObjectInputVersions(transaction.getData());
    }, [transaction]);

    const objectInputMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const entry of objectInputs) {
            if (!map.has(entry.objectId)) {
                map.set(entry.objectId, entry.version);
            }
        }
        return map;
    }, [objectInputs]);

    const objectIds = useMemo(() => Array.from(objectInputMap.keys()), [objectInputMap]);

    const { data: latestObjects, isLoading } = useMultiGetObjects(
        objectIds,
        {
            showType: false,
            showContent: false,
            showOwner: false,
            showPreviousTransaction: false,
            showStorageRebate: false,
            showDisplay: false,
        },
        {
            enabled: objectIds.length > 0,
        },
    );

    const deprecatedObjects = useMemo(() => {
        if (!latestObjects?.length || objectIds.length === 0) return [];

        const latestVersionById = new Map<string, string>();
        for (const response of latestObjects) {
            const objectId = response?.data?.objectId;
            const version = response?.data?.version;
            if (objectId && version) {
                latestVersionById.set(objectId, String(version));
            }
        }

        const deprecated: DeprecatedTransactionObject[] = [];
        for (const [objectId, expectedVersion] of objectInputMap) {
            const latestVersion = latestVersionById.get(objectId) ?? null;
            if (!latestVersion || latestVersion !== expectedVersion) {
                deprecated.push({
                    objectId,
                    expectedVersion,
                    latestVersion,
                });
            }
        }

        return deprecated;
    }, [latestObjects, objectIds, objectInputMap]);

    return { deprecatedObjects, isLoading };
}
