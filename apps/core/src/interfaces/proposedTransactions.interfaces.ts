// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { DryRunTransactionBlockResponse } from '@iota/iota-sdk/client';

export interface ProposedExtendedTransaction {
    action: ProposedTransactionAction;
    raw: DryRunTransactionBlockResponse;
}

export enum ProposedTransactionAction {
    Send = 'Send',
    Receive = 'Receive',
    Transaction = 'Transaction',
    Staked = 'Stake',
    Unstaked = 'Unstake',
    TimelockedStaked = 'Stake Vesting',
    TimelockedUnstaked = 'Unstake Vesting',
}
