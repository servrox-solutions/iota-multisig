// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import {
    OpenAPIRegistry,
    OpenApiGeneratorV3,
    extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export { z };

export const registry = new OpenAPIRegistry();

registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
});

export function generateOpenApiDocument() {
    return new OpenApiGeneratorV3(registry.definitions).generateDocument({
        openapi: '3.0.0',
        info: {
            title: 'IOTA Vault',
            version: '1.0.0',
        },
        security: [{ bearerAuth: [] }],
    });
}
