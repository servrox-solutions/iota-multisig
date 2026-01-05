// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Body, Controller, Header, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from 'src/supabase/supabase.service';

export interface GetTokenPriceBody {
    payload: Record<string, string | number>;
    publicKey: string;
}
@Controller()
export class VaultController {
    constructor(private supabaseService: SupabaseService) {}

    @Post('/vaults/jwt')
    @Header('Cache-Control', 'max-age=0, must-revalidate')
    async getTokenPrice(@Body() body: GetTokenPriceBody, @Res() res: Response) {
        const authToken = await this.supabaseService.generateSupabaseJwtToken(
            body.payload,
            body.publicKey,
        );
        return res.status(HttpStatus.OK).send({ authToken });
    }
}
