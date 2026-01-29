// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { Button, ButtonType } from '@iota/apps-ui-kit';

export function VaultProposedTransactionActions({
    onAction,
}: {
    onAction: (action: 'approve' | 'reject' | 'submit') => void,
}) {
    return (
        <div className="flex w-full flex-col gap-1 overflow-y-auto overflow-x-hidden">
            <div className="flex w-full justify-stretch gap-2">
                <div className="flex-1">
                    <Button text="Approve" fullWidth={true} onClick={() => onAction('approve')} />
                </div>
                <div className="flex-1">
                    <Button
                        text="Reject"
                        fullWidth={true}
                        type={ButtonType.Destructive}
                        onClick={() => onAction('reject')}
                    />
                </div>
                <div className="flex-1">
                    <Button
                        text="Submit"
                        fullWidth={true}
                        type={ButtonType.Primary}
                        onClick={() => onAction('submit')}
                    />
                </div>
            </div>
        </div>
    );
}
