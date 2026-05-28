// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { GrowthBook } from '@growthbook/growthbook';
import { getAppsBackend } from '@iota/iota-sdk/client';

const GROWTHBOOK_ENVIRONMENTS = {
    production: {
        clientKey: 'production',
    },
    staging: {
        clientKey: 'staging',
    },
    development: {
        clientKey: 'staging',
        enableDevMode: true,
        disableCache: true,
    },
};

const environment =
    (process.env.NEXT_PUBLIC_BUILD_ENV as keyof typeof GROWTHBOOK_ENVIRONMENTS) || 'development';
const growthbookEnvironment =
    GROWTHBOOK_ENVIRONMENTS[environment] ?? GROWTHBOOK_ENVIRONMENTS.development;

export const growthbook = new GrowthBook({
    apiHost: getAppsBackend(),
    ...growthbookEnvironment,
});
