// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Body, Controller, Header, HttpStatus, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { SupabaseService } from 'src/supabase/supabase.service';

@Controller()
export class VaultController {
    constructor(private supabaseService: SupabaseService) {}

    @Post('/vaults/jwt')
    @Header('Cache-Control', 'max-age=0, must-revalidate')
    async getTokenPrice(@Body() body: Record<string, string | number>, @Res() res: Response) {
        const authToken = await this.supabaseService.generateSupabaseJwtToken(body);
        return res.status(HttpStatus.OK).send({ authToken });
    }
}
