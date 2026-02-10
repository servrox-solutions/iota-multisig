// Copyright (c) 2024 IOTA Stiftung
// SPDX-License-Identifier: Apache-2.0

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { respondToVaultInvitation } from 'iota-vault-sdk';

export interface VaultInvitationResponse {
    vaultId: number;
    status: 'accepted' | 'rejected';
}

export const useVaultRespondInvitation = ({
    onSuccess,
}: {
    onSuccess?: (invitationResponse: VaultInvitationResponse) => void;
}) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (vaultInvitation: VaultInvitationResponse) =>
            respondToVaultInvitation(vaultInvitation),
        // Always refetch after error or success. This also overwrites the optimistic update with the final values.
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['vault'] }),
        onSuccess: (_, variables) => onSuccess?.(variables),
    });
};
