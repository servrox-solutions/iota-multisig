'use client';

import { VaultOwners } from '@/components/vault-owners';
import { useVaultById } from '@/hooks/useVaultById';
import { Header, Panel } from '@iota/apps-ui-kit';

// import { useSupabaseUser } from '@/hooks/useSupabaseUser';

function VaultOwnerOverviewPage({ params }: { params: { 'vault-id': string } }): JSX.Element {
    const { 'vault-id': vaultId } = params;

    const { data: vault } = useVaultById(Number(vaultId));

    return (
        <div className="relative h-full w-full overflow-hidden">
            <Panel>
                <div className="flex flex-1 flex-col items-center justify-center gap-4 px-sm pb-md pt-sm">
                    <div className="flex w-2/3 flex-col gap-5">
                        <div className="flex flex-col items-center justify-center">
                            <Header
                                title={'Vault Invitation: ' + vault?.vaultName}
                                titleCentered={true}
                            />
                            <span className="max-w-sm text-center text-label-lg text-iota-neutral-60">
                                You can get started once all owners have accepted.
                            </span>
                        </div>
                        <VaultOwners vaultId={Number(vaultId)} />
                    </div>
                </div>
            </Panel>
        </div>
    );
}

export default VaultOwnerOverviewPage;
