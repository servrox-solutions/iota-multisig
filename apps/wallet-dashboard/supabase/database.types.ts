export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: '13.0.5';
    };
    public: {
        Tables: {
            owners: {
                Row: {
                    address: string;
                    created_at: string;
                    public_key: string | null;
                    updated_at: string;
                };
                Insert: {
                    address: string;
                    created_at?: string;
                    public_key?: string | null;
                    updated_at?: string;
                };
                Update: {
                    address?: string;
                    created_at?: string;
                    public_key?: string | null;
                    updated_at?: string;
                };
                Relationships: [];
            };
            proposed_transactions: {
                Row: {
                    comment: string | null;
                    created_at: string;
                    declined_at: string | null;
                    executed_at: string | null;
                    executed_by: string | null;
                    id: number;
                    proposed_by: string;
                    transaction_digest: string | null;
                    transaction_payload: string;
                    vault_id: number;
                };
                Insert: {
                    comment?: string | null;
                    created_at?: string;
                    declined_at?: string | null;
                    executed_at?: string | null;
                    executed_by?: string | null;
                    id?: number;
                    proposed_by: string;
                    transaction_digest?: string | null;
                    transaction_payload: string;
                    vault_id: number;
                };
                Update: {
                    comment?: string | null;
                    created_at?: string;
                    declined_at?: string | null;
                    executed_at?: string | null;
                    executed_by?: string | null;
                    id?: number;
                    proposed_by?: string;
                    transaction_digest?: string | null;
                    transaction_payload?: string;
                    vault_id?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'proposed_transactions_executed_by_fkey';
                        columns: ['executed_by'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['address'];
                    },
                    {
                        foreignKeyName: 'proposed_transactions_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'proposed_transactions_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults_of_current_user';
                        referencedColumns: ['id'];
                    },
                ];
            };
            signatures: {
                Row: {
                    created_at: string;
                    id: number;
                    owner_address: string;
                    signature: string | null;
                    transaction_id: number;
                    updated_at: string;
                };
                Insert: {
                    created_at?: string;
                    id?: number;
                    owner_address: string;
                    signature?: string | null;
                    transaction_id: number;
                    updated_at?: string;
                };
                Update: {
                    created_at?: string;
                    id?: number;
                    owner_address?: string;
                    signature?: string | null;
                    transaction_id?: number;
                    updated_at?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'signatures_owner_address_fkey';
                        columns: ['owner_address'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['address'];
                    },
                    {
                        foreignKeyName: 'signatures_transaction_id_fkey';
                        columns: ['transaction_id'];
                        isOneToOne: false;
                        referencedRelation: 'proposed_transactions';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'signatures_transaction_id_fkey';
                        columns: ['transaction_id'];
                        isOneToOne: false;
                        referencedRelation: 'proposed_transactions_of_current_user';
                        referencedColumns: ['id'];
                    },
                ];
            };
            vault_owners: {
                Row: {
                    id: number;
                    owner_address: string;
                    status: string;
                    vault_id: number;
                    weight: number;
                };
                Insert: {
                    id?: number;
                    owner_address: string;
                    status?: string;
                    vault_id: number;
                    weight: number;
                };
                Update: {
                    id?: number;
                    owner_address?: string;
                    status?: string;
                    vault_id?: number;
                    weight?: number;
                };
                Relationships: [
                    {
                        foreignKeyName: 'vault_owners_owner_address_fkey';
                        columns: ['owner_address'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['address'];
                    },
                    {
                        foreignKeyName: 'vault_owners_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'vault_owners_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults_of_current_user';
                        referencedColumns: ['id'];
                    },
                ];
            };
            vault_whitelist: {
                Row: {
                    id: number;
                    vault_id: number;
                    whitelist_address: string;
                };
                Insert: {
                    id?: number;
                    vault_id: number;
                    whitelist_address: string;
                };
                Update: {
                    id?: number;
                    vault_id?: number;
                    whitelist_address?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: 'vault_whitelist_owner_address_fkey';
                        columns: ['whitelist_address'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['address'];
                    },
                    {
                        foreignKeyName: 'vault_whitelist_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'vault_whitelist_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults_of_current_user';
                        referencedColumns: ['id'];
                    },
                ];
            };
            vaults: {
                Row: {
                    created_at: string;
                    creator_address: string;
                    id: number;
                    name: string;
                    network: Database['public']['Enums']['network'];
                    threshold: number;
                    updated_at: string;
                };
                Insert: {
                    created_at?: string;
                    creator_address: string;
                    id?: number;
                    name: string;
                    network: Database['public']['Enums']['network'];
                    threshold: number;
                    updated_at?: string;
                };
                Update: {
                    created_at?: string;
                    creator_address?: string;
                    id?: number;
                    name?: string;
                    network?: Database['public']['Enums']['network'];
                    threshold?: number;
                    updated_at?: string;
                };
                Relationships: [];
            };
        };
        Views: {
            proposed_transactions_of_current_user: {
                Row: {
                    approvals: string[] | null;
                    comment: string | null;
                    created_at: string | null;
                    declined_at: string | null;
                    executed_at: string | null;
                    executed_by: string | null;
                    id: number | null;
                    pending: string[] | null;
                    proposed_by: string | null;
                    rejections: string[] | null;
                    transaction_digest: string | null;
                    transaction_payload: string | null;
                    vault_id: number | null;
                };
                Relationships: [
                    {
                        foreignKeyName: 'proposed_transactions_executed_by_fkey';
                        columns: ['executed_by'];
                        isOneToOne: false;
                        referencedRelation: 'owners';
                        referencedColumns: ['address'];
                    },
                    {
                        foreignKeyName: 'proposed_transactions_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults';
                        referencedColumns: ['id'];
                    },
                    {
                        foreignKeyName: 'proposed_transactions_vault_id_fkey';
                        columns: ['vault_id'];
                        isOneToOne: false;
                        referencedRelation: 'vaults_of_current_user';
                        referencedColumns: ['id'];
                    },
                ];
            };
            vaults_of_current_user: {
                Row: {
                    creator_address: string | null;
                    id: number | null;
                    name: string | null;
                    network: Database['public']['Enums']['network'] | null;
                    owners: Json | null;
                    threshold: number | null;
                    whitelist: Json | null;
                };
                Relationships: [];
            };
        };
        Functions: {
            add_vault_whitelist_address: {
                Args: { p_vault_id: number; p_whitelist_address: string };
                Returns: undefined;
            };
            create_vault_invitation: {
                Args: {
                    p_name: string;
                    p_networks: Database['public']['Enums']['network'][];
                    p_threshold: number;
                    p_users: Json;
                };
                Returns: number[];
            };
            get_execute_transaction_data: {
                Args: { p_proposed_transaction_id: number };
                Returns: {
                    is_executable: boolean;
                    network: string;
                    owners: Json;
                    signed_weight: number;
                    transaction_payload: string;
                    vault_threshold: number;
                }[];
            };
            propose_transaction:
                | {
                      Args: {
                          p_comment: string;
                          p_transaction_data: string;
                          p_vault_id: number;
                      };
                      Returns: undefined;
                  }
                | {
                      Args: {
                          p_comment: string;
                          p_signature?: string;
                          p_transaction_data: string;
                          p_vault_id: number;
                      };
                      Returns: undefined;
                  };
            remove_vault_whitelist_address: {
                Args: { p_vault_id: number; p_whitelist_address: string };
                Returns: undefined;
            };
            respond_to_vault_invitation: {
                Args: { p_status: string; p_vault_id: number };
                Returns: undefined;
            };
            set_approval: {
                Args: { p_signature?: string; p_transaction_id: number };
                Returns: undefined;
            };
        };
        Enums: {
            network: 'mainnet' | 'testnet' | 'devnet' | 'localnet' | 'custom';
        };
        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
    DefaultSchemaTableNameOrOptions extends
        | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
              DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
          DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
          Row: infer R;
      }
        ? R
        : never
    : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] &
            DefaultSchema['Views'])
      ? (DefaultSchema['Tables'] &
            DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
            Row: infer R;
        }
          ? R
          : never
      : never;

export type TablesInsert<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Insert: infer I;
      }
        ? I
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Insert: infer I;
        }
          ? I
          : never
      : never;

export type TablesUpdate<
    DefaultSchemaTableNameOrOptions extends
        | keyof DefaultSchema['Tables']
        | { schema: keyof DatabaseWithoutInternals },
    TableName extends DefaultSchemaTableNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
        : never = never,
> = DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
          Update: infer U;
      }
        ? U
        : never
    : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
      ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
            Update: infer U;
        }
          ? U
          : never
      : never;

export type Enums<
    DefaultSchemaEnumNameOrOptions extends
        | keyof DefaultSchema['Enums']
        | { schema: keyof DatabaseWithoutInternals },
    EnumName extends DefaultSchemaEnumNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
        : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
    : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
      ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
      : never;

export type CompositeTypes<
    PublicCompositeTypeNameOrOptions extends
        | keyof DefaultSchema['CompositeTypes']
        | { schema: keyof DatabaseWithoutInternals },
    CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
        schema: keyof DatabaseWithoutInternals;
    }
        ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
        : never = never,
> = PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
}
    ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
    : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
      ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
      : never;

export const Constants = {
    public: {
        Enums: {
            network: ['mainnet', 'testnet', 'devnet', 'localnet', 'custom'],
        },
    },
} as const;
