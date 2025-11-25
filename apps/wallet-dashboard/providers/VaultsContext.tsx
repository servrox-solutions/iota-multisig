// vault-context.tsx
import { PersistedVault, PersistVault } from '@/lib/types/vaults';
import { deserializeVault, vaultIdentifier } from '@/lib/utils/vaults';
import { useLocalStorage } from '@iota/core';
import { createContext, ReactNode, useContext, useEffect } from 'react';
import { MultiSigPublicKey } from '../../../sdk/typescript/dist/esm/multisig/publickey';

const LOCAL_STORAGE_KEY = 'vaults_iota-dashboard';

interface VaultContextValue {
    persistedVaults: PersistedVault[];
    addPersistedVault: (vault: PersistVault) => PersistedVault;
    removePersistedVault: (address: string) => void;
    getVault: (address: string) => PersistedVault | undefined;
}

export class VaultAlreadyAddedError extends Error { }

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultsProvider({ children }: { children: ReactNode }) {
    const [persistedVaults, setPersistedVaults] = useLocalStorage<PersistedVault[]>(
        LOCAL_STORAGE_KEY,
        [
            {
                vaultName: 'TestVault',
                threshold: 2,
                owners: [],
                address: '0x444b4c2822b213add43a0be6bbe5321ed34b56d1505de22c9ea042a8a2338945',
            },
        ],
    );

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(persistedVaults));
    }, [persistedVaults]);

    const addPersistedVault = (vault: PersistVault): PersistedVault => {
        const exists = persistedVaults.some((v) => vaultIdentifier(v) === vaultIdentifier(vault));
        if (exists) throw new VaultAlreadyAddedError('Vault already exists');

        const multiSig = MultiSigPublicKey.fromPublicKeys(deserializeVault(vault));
        const persist: PersistedVault = { ...vault, address: multiSig.toIotaAddress() };

        setPersistedVaults((prev) => [...prev, persist]);
        return persist;
    };

    const removePersistedVault = (address: string) => {
        setPersistedVaults((prev) => prev.filter((v) => v.address !== address));
    };

    const getVault = (address: string) =>
        persistedVaults.find((vault) => vault.address.toLowerCase() === address.toLowerCase());

    return (
        <VaultContext.Provider
            value={{ persistedVaults, addPersistedVault, removePersistedVault, getVault }}
        >
            {children}
        </VaultContext.Provider>
    );
}

export function usePersistedVaults() {
    const ctx = useContext(VaultContext);
    if (!ctx) throw new Error('usePersistedVaults must be used inside <VaultProvider>');
    return ctx;
}
