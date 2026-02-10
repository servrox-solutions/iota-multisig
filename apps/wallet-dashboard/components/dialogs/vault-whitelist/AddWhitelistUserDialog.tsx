// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

'use client';

import {
    Button,
    ButtonHtmlType,
    ButtonType,
    Dialog,
    DialogBody,
    DialogContent,
    Header,
    Input,
    InputType,
} from '@iota/apps-ui-kit';
import { toast } from '@iota/core';
import { isValidIotaAddress } from '@iota/iota-sdk/utils';
import { useEffect, useMemo, useState } from 'react';

interface AddWhitelistUserDialogProps {
    open: boolean;
    setOpen: (open: boolean) => void;
    existingAddresses: string[];
    isSubmitting?: boolean;
    onSubmit: (address: string) => Promise<unknown>;
}

export function AddWhitelistUserDialog({
    open,
    setOpen,
    existingAddresses,
    isSubmitting,
    onSubmit,
}: AddWhitelistUserDialogProps): React.JSX.Element {
    const [address, setAddress] = useState('');
    const addressSet = useMemo(() => new Set(existingAddresses), [existingAddresses]);

    useEffect(() => {
        if (!open) {
            setAddress('');
        }
    }, [open]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const trimmed = address.trim();
        if (!trimmed || !isValidIotaAddress(trimmed)) {
            toast.error('Enter a valid address.');
            return;
        }
        if (addressSet.has(trimmed)) {
            toast.error('Address already whitelisted.');
            return;
        }
        try {
            await onSubmit(trimmed);
            setOpen(false);
        } catch (error) {
            // Toast handled in hook.
            console.error(error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent containerId="overlay-portal-container">
                <Header title="Add Whitelist Address" onClose={() => setOpen(false)} />
                <DialogBody>
                    <form className="flex w-full flex-col gap-md" onSubmit={handleSubmit}>
                        <Input
                            label="Whitelist Address"
                            type={InputType.Text}
                            placeholder="Enter address"
                            value={address}
                            onChange={(event) => setAddress(event.target.value)}
                        />
                        <Button
                            type={ButtonType.Primary}
                            text="Add"
                            htmlType={ButtonHtmlType.Submit}
                            disabled={!address.trim() || isSubmitting}
                            fullWidth
                        />
                    </form>
                </DialogBody>
            </DialogContent>
        </Dialog>
    );
}
