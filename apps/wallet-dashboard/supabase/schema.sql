


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."network" AS ENUM (
    'mainnet',
    'testnet',
    'devnet',
    'localnet',
    'custom'
);


ALTER TYPE "public"."network" OWNER TO "postgres";


COMMENT ON TYPE "public"."network" IS 'IOTA Network';



CREATE OR REPLACE FUNCTION "public"."add_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_address TEXT;
  v_normalized_address TEXT;
BEGIN
  -- normalize inputs
  v_caller_address := lower(auth.jwt() ->> 'sub');
  v_normalized_address := lower(p_whitelist_address);

  IF v_caller_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub missing'
      USING ERRCODE = 'invalid_authorization_specification';
  END IF;

  -- 1. ensure vault exists
  IF NOT EXISTS (
    SELECT 1
    FROM public.vaults v
    WHERE v.id = p_vault_id
  ) THEN
    RAISE EXCEPTION 'Vault does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 2. caller must be vault owner
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_owners vo
    WHERE vo.vault_id = p_vault_id
      AND lower(vo.owner_address) = v_caller_address
  ) THEN
    RAISE EXCEPTION 'Only vault owners can add to whitelist'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. ensure user exists (create if missing)
  INSERT INTO public.owners (address)
  VALUES (v_normalized_address)
  ON CONFLICT (address) DO NOTHING;

  -- 4. address must NOT already be a vault owner
  IF EXISTS (
    SELECT 1
    FROM public.vault_owners vo2
    WHERE vo2.vault_id = p_vault_id
      AND lower(vo2.owner_address) = v_normalized_address
  ) THEN
    RAISE EXCEPTION 'Address is already a vault owner'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 5. address must NOT already be whitelisted
  IF EXISTS (
    SELECT 1
    FROM public.vault_whitelist vw
    WHERE vw.vault_id = p_vault_id
      AND lower(vw.whitelist_address) = v_normalized_address
  ) THEN
    RAISE EXCEPTION 'Address already whitelisted'
      USING ERRCODE = 'unique_violation';
  END IF;

  -- 6. insert whitelist entry
  INSERT INTO public.vault_whitelist (
    vault_id,
    whitelist_address
  )
  VALUES (
    p_vault_id,
    v_normalized_address
  );

END;
$$;


ALTER FUNCTION "public"."add_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_vault_invitation"("p_users" "jsonb", "p_threshold" smallint, "p_name" "text", "p_networks" "public"."network"[]) RETURNS bigint[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_creator_address TEXT;
  v_vault_ids BIGINT[] := '{}';
  v_network network;
  v_vault_id BIGINT;
BEGIN
  -- Creator from JWT
  v_creator_address := auth.jwt() ->> 'sub';

  IF v_creator_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (creator_address) missing';
  END IF;

  ------------------------------------------------------------
  -- Creator must be included
  ------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_users) AS e(elem)
    WHERE lower(e.elem->>'address') = lower(v_creator_address)
  ) THEN
    RAISE EXCEPTION 'Creator must be included in owners list';
  END IF;

  ------------------------------------------------------------
  -- Threshold validation
  ------------------------------------------------------------
  IF p_threshold > (
    SELECT COALESCE(SUM((e.elem->>'weight')::int2), 0)
    FROM jsonb_array_elements(p_users) AS e(elem)
  ) THEN
    RAISE EXCEPTION 'Threshold exceeds total owner weight';
  END IF;

  ------------------------------------------------------------
  -- Insert owners (unordered OK)
  ------------------------------------------------------------
  INSERT INTO owners (address)
  SELECT DISTINCT lower(e.elem->>'address')
  FROM jsonb_array_elements(p_users) AS e(elem)
  ON CONFLICT (address) DO NOTHING;

  ------------------------------------------------------------
  -- Loop networks
  ------------------------------------------------------------
  FOREACH v_network IN ARRAY (
    SELECT ARRAY(
      SELECT DISTINCT unnest(p_networks)
    )
  )
  LOOP

    ----------------------------------------------------------
    -- 🔁 ORDER-SENSITIVE duplicate check
    ----------------------------------------------------------
    SELECT v.id
    INTO v_vault_id
    FROM vaults v
    WHERE v.network = v_network
      AND v.threshold = p_threshold

      -- same number of owners
      AND (
        SELECT COUNT(*)
        FROM vault_owners vo
        WHERE vo.vault_id = v.id
      ) = jsonb_array_length(p_users)

      -- ordered comparison (vo.id vs JSON position)
      AND NOT EXISTS (
        SELECT 1
        FROM (
          -- existing owners ordered by insertion order (id)
          SELECT
            row_number() OVER (ORDER BY vo.id) - 1 AS pos,
            lower(vo.owner_address) AS owner_address,
            vo.weight
          FROM vault_owners vo
          WHERE vo.vault_id = v.id
        ) existing
        FULL JOIN (
          -- input owners ordered by JSON array position
          SELECT
            (e.ord - 1) AS pos,
            lower(e.elem->>'address') AS owner_address,
            (e.elem->>'weight')::int2 AS weight
          FROM jsonb_array_elements(p_users)
               WITH ORDINALITY AS e(elem, ord)
        ) input
        USING (pos)
        WHERE
          existing.owner_address IS DISTINCT FROM input.owner_address
          OR existing.weight IS DISTINCT FROM input.weight
      )

    LIMIT 1;

    ----------------------------------------------------------
    -- Reuse vault if exact ordered match
    ----------------------------------------------------------
    IF v_vault_id IS NOT NULL THEN
      v_vault_ids := array_append(v_vault_ids, v_vault_id);
      CONTINUE;
    END IF;

    ----------------------------------------------------------
    -- Create new vault
    ----------------------------------------------------------
    INSERT INTO vaults (
      name,
      threshold,
      creator_address,
      network
    )
    VALUES (
      p_name,
      p_threshold,
      v_creator_address,
      v_network
    )
    RETURNING id INTO v_vault_id;

    ----------------------------------------------------------
    -- Insert vault owners in JSON order
    -- auto-increment id will follow this order
    ----------------------------------------------------------
    INSERT INTO vault_owners (
      owner_address,
      vault_id,
      weight,
      status
    )
    SELECT
      lower(e.elem->>'address'),
      v_vault_id,
      (e.elem->>'weight')::int2,
      CASE
        WHEN lower(e.elem->>'address') = lower(v_creator_address)
          THEN 'accepted'
        ELSE 'pending'
      END
    FROM jsonb_array_elements(p_users)
         WITH ORDINALITY AS e(elem, ord)
    ORDER BY e.ord;

    v_vault_ids := array_append(v_vault_ids, v_vault_id);

  END LOOP;

  RETURN v_vault_ids;
END;
$$;


ALTER FUNCTION "public"."create_vault_invitation"("p_users" "jsonb", "p_threshold" smallint, "p_name" "text", "p_networks" "public"."network"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_execute_transaction_data"("p_proposed_transaction_id" bigint) RETURNS TABLE("vault_threshold" integer, "network" "text", "transaction_payload" "text", "owners" "jsonb", "signed_weight" integer, "is_executable" boolean)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$
WITH base AS (
  SELECT
    pt.id                    AS transaction_id,
    pt.transaction_payload,
    pt.vault_id,
    v.threshold              AS vault_threshold,
    v.network                AS network
  FROM proposed_transactions pt
  JOIN vaults v
    ON v.id = pt.vault_id
  WHERE pt.id = p_proposed_transaction_id
),

owner_state AS (
  SELECT
    b.transaction_id,
    vo.id            AS vault_owner_id, -- add this
    vo.owner_address,
    vo.weight,
    vo.status,
    o.public_key,
    s.signature
  FROM base b

  -- ALL OWNERS OF VAULT
  JOIN vault_owners vo
    ON vo.vault_id = b.vault_id

  -- public key from owners table
  JOIN owners o
    ON o.address = vo.owner_address

  -- signature if exists
  LEFT JOIN signatures s
    ON s.transaction_id = b.transaction_id
   AND s.owner_address = vo.owner_address
),

aggregated AS (
  SELECT
    transaction_id,

    jsonb_agg(
      jsonb_build_object(
        'owner_address', owner_address,
        'public_key', public_key,
        'weight', weight,
        'status', status,
        'signature', signature
      )
      ORDER BY vault_owner_id ASC -- sort by vault_owners.id
    ) AS owners,

    COALESCE(
      SUM(weight) FILTER (WHERE signature IS NOT NULL),
      0
    ) AS signed_weight

  FROM owner_state
  GROUP BY transaction_id
)

SELECT
  b.vault_threshold,
  b.network,
  b.transaction_payload::bytea::text,
  a.owners,
  a.signed_weight,
  (a.signed_weight >= b.vault_threshold) AS is_executable

FROM base b
JOIN aggregated a
  ON a.transaction_id = b.transaction_id;
$$;


ALTER FUNCTION "public"."get_execute_transaction_data"("p_proposed_transaction_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_owner_status_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_actor TEXT := auth.jwt() ->> 'sub';
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN

    IF NEW.status = 'accepted' THEN
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        actor_address,
        subject_address
      )
      VALUES (
        'OWNER_ACCEPTED',
        NEW.vault_id,
        v_actor,
        NEW.owner_address
      );

    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        actor_address,
        subject_address
      )
      VALUES (
        'OWNER_REJECTED',
        NEW.vault_id,
        v_actor,
        NEW.owner_address
      );
    END IF;

  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_owner_status_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_signature_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_vault_id BIGINT;
BEGIN
  -- Get vault id from transaction
  SELECT vault_id INTO v_vault_id
  FROM public.proposed_transactions
  WHERE id = NEW.transaction_id;

  ------------------------------------------------------------------
  -- INSERT CASE
  ------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN

    IF NEW.signature IS NOT NULL THEN
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        transaction_id,
        actor_address
      )
      VALUES (
        'TX_APPROVED',
        v_vault_id,
        NEW.transaction_id,
        NEW.owner_address
      );

    ELSE
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        transaction_id,
        actor_address
      )
      VALUES (
        'TX_REJECTED',
        v_vault_id,
        NEW.transaction_id,
        NEW.owner_address
      );
    END IF;

    RETURN NEW;
  END IF;

  ------------------------------------------------------------------
  -- UPDATE CASE
  ------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN

    IF OLD.signature IS NULL AND NEW.signature IS NOT NULL THEN
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        transaction_id,
        actor_address
      )
      VALUES (
        'TX_APPROVED',
        v_vault_id,
        NEW.transaction_id,
        NEW.owner_address
      );

    ELSIF OLD.signature IS NOT NULL AND NEW.signature IS NULL THEN
      INSERT INTO public.audit_events (
        event_type,
        vault_id,
        transaction_id,
        actor_address
      )
      VALUES (
        'TX_REJECTED',
        v_vault_id,
        NEW.transaction_id,
        NEW.owner_address
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_signature_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_tx_executed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF OLD.transaction_digest IS NULL AND NEW.transaction_digest IS NOT NULL THEN
    INSERT INTO public.audit_events (
      event_type,
      vault_id,
      transaction_id,
      actor_address,
      metadata
    )
    VALUES (
      'TX_EXECUTED',
      NEW.vault_id,
      NEW.id,
      auth.jwt() ->> 'sub',
      jsonb_build_object(
        'digest', NEW.transaction_digest
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_tx_executed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_tx_proposed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    vault_id,
    transaction_id,
    actor_address,
    metadata
  )
  VALUES (
    'TX_PROPOSED',
    NEW.vault_id,
    NEW.id,
    NEW.proposed_by,
    jsonb_build_object(
      'comment', NEW.comment
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_tx_proposed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_vault_created"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    vault_id,
    actor_address,
    metadata
  )
  VALUES (
    'VAULT_CREATED',
    NEW.id,
    NEW.creator_address,
    jsonb_build_object(
      'name', NEW.name,
      'threshold', NEW.threshold,
      'network', NEW.network
    )
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_vault_created"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_vault_name_updated"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_actor TEXT := auth.jwt() ->> 'sub';
BEGIN
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO public.audit_events (
      event_type,
      vault_id,
      actor_address,
      metadata
    )
    VALUES (
      'VAULT_NAME_UPDATED',
      NEW.id,
      v_actor,
      jsonb_build_object(
        'old_name', OLD.name,
        'new_name', NEW.name
      )
    );
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_vault_name_updated"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_whitelist_added"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_actor TEXT := auth.jwt() ->> 'sub';
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    vault_id,
    actor_address,
    subject_address
  )
  VALUES (
    'WHITELIST_ADDED',
    NEW.vault_id,
    v_actor,
    NEW.whitelist_address
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_whitelist_added"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_whitelist_removed"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_actor TEXT := auth.jwt() ->> 'sub';
BEGIN
  INSERT INTO public.audit_events (
    event_type,
    vault_id,
    actor_address,
    subject_address
  )
  VALUES (
    'WHITELIST_REMOVED',
    OLD.vault_id,
    v_actor,
    OLD.whitelist_address
  );

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."log_whitelist_removed"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_address TEXT;
BEGIN
  -- Read caller address from JWT
  v_address := auth.jwt() ->> 'sub';

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (owner_address) missing';
  END IF;

  -- Verify the caller is an owner of the vault
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_owners vo
    WHERE vo.vault_id = p_vault_id
      AND vo.owner_address = v_address
  ) THEN
    RAISE EXCEPTION 'User % is not an owner of vault %', v_address, p_vault_id;
  END IF;

  -- Insert proposal referencing the vault (vaults.id)
  INSERT INTO public.proposed_transactions (
    vault_id,
    proposed_by,
    transaction_payload,
    comment
  )
  VALUES (
    p_vault_id,
    v_address,
    p_transaction_data,
    p_comment
  );
END;
$$;


ALTER FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text", "p_signature" "bytea" DEFAULT NULL::"bytea") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_address TEXT;
  v_transaction_id BIGINT;
  v_is_owner BOOLEAN;
  v_is_whitelisted BOOLEAN;
BEGIN
  -- Read caller address from JWT
  v_address := lower(auth.jwt() ->> 'sub');

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (address) missing';
  END IF;

  -- Check owner status
  SELECT EXISTS (
    SELECT 1
    FROM public.vault_owners vo
    WHERE vo.vault_id = p_vault_id
      AND lower(vo.owner_address) = v_address
  )
  INTO v_is_owner;

  -- Check whitelist status
  SELECT EXISTS (
    SELECT 1
    FROM public.vault_whitelist vw
    WHERE vw.vault_id = p_vault_id
      AND lower(vw.whitelist_address) = v_address
  )
  INTO v_is_whitelisted;

  -- Must be owner OR whitelisted
  IF NOT (v_is_owner OR v_is_whitelisted) THEN
    RAISE EXCEPTION
      'User % is neither owner nor whitelisted for vault %',
      v_address,
      p_vault_id;
  END IF;

  -- Insert proposal
  INSERT INTO public.proposed_transactions (
    vault_id,
    proposed_by,
    transaction_payload,
    comment
  )
  VALUES (
    p_vault_id,
    v_address,
    p_transaction_data,
    p_comment
  )
  RETURNING id INTO v_transaction_id;

  -- Only owners may attach signatures
  IF p_signature IS NOT NULL THEN
    IF NOT v_is_owner THEN
      RAISE EXCEPTION
        'Only vault owners may attach signatures';
    END IF;

    INSERT INTO public.signatures (
      owner_address,
      transaction_id,
      signature
    )
    VALUES (
      v_address,
      v_transaction_id,
      p_signature
    );
  END IF;

END;
$$;


ALTER FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text", "p_signature" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."remove_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_caller_address TEXT;
  v_normalized_address TEXT;
BEGIN
  -- normalize inputs
  v_caller_address := lower(auth.jwt() ->> 'sub');
  v_normalized_address := lower(p_whitelist_address);

  IF v_caller_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub missing'
      USING ERRCODE = 'invalid_authorization_specification';
  END IF;

  -- 1. ensure vault exists
  IF NOT EXISTS (
    SELECT 1
    FROM public.vaults v
    WHERE v.id = p_vault_id
  ) THEN
    RAISE EXCEPTION 'Vault does not exist'
      USING ERRCODE = 'foreign_key_violation';
  END IF;

  -- 2. caller must be vault owner
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_owners vo
    WHERE vo.vault_id = p_vault_id
      AND lower(vo.owner_address) = v_caller_address
  ) THEN
    RAISE EXCEPTION 'Only vault owners can remove from whitelist'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- 3. ensure address is NOT a vault owner
  IF EXISTS (
    SELECT 1
    FROM public.vault_owners vo2
    WHERE vo2.vault_id = p_vault_id
      AND lower(vo2.owner_address) = v_normalized_address
  ) THEN
    RAISE EXCEPTION 'Cannot remove a vault owner from whitelist'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;

  -- 4. ensure address is actually whitelisted
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_whitelist vw
    WHERE vw.vault_id = p_vault_id
      AND lower(vw.whitelist_address) = v_normalized_address
  ) THEN
    RAISE EXCEPTION 'Address is not whitelisted'
      USING ERRCODE = 'no_data_found';
  END IF;

  -- 5. delete whitelist entry
  DELETE FROM public.vault_whitelist
  WHERE vault_id = p_vault_id
    AND lower(whitelist_address) = v_normalized_address;

END;
$$;


ALTER FUNCTION "public"."remove_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."respond_to_vault_invitation"("p_vault_id" bigint, "p_status" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_address TEXT;
BEGIN
  -- Read caller address from JWT
  v_address := auth.jwt() ->> 'sub';

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (owner_address) missing';
  END IF;

  -- Validate status
  IF p_status NOT IN ('accepted', 'rejected') THEN
    RAISE EXCEPTION 'Invalid status. Must be accepted or rejected';
  END IF;

  -- Update only the caller's row
  UPDATE vault_owners
  SET status = p_status
  WHERE vault_id = p_vault_id
    AND owner_address = v_address;

  -- Ensure exactly one row was updated
  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No vault owner entry found for this user and vault';
  END IF;
END;
$$;


ALTER FUNCTION "public"."respond_to_vault_invitation"("p_vault_id" bigint, "p_status" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_approval"("p_transaction_id" bigint, "p_signature" "bytea" DEFAULT NULL::"bytea") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_address TEXT;
  v_vault_id BIGINT;
  v_declined_at TIMESTAMPTZ;

  v_threshold INT;
  v_total_weight INT;
  v_decline_weight INT;
  v_remaining_weight INT;
BEGIN
  -- Caller address
  v_address := auth.jwt() ->> 'sub';

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (owner_address) missing';
  END IF;

  -- Lock proposed transaction
  SELECT vault_id, declined_at
  INTO v_vault_id, v_declined_at
  FROM public.proposed_transactions
  WHERE id = p_transaction_id
  FOR UPDATE;

  IF v_vault_id IS NULL THEN
    RAISE EXCEPTION 'Proposed transaction % not found', p_transaction_id;
  END IF;

  -- Already declined
  IF v_declined_at IS NOT NULL THEN
    RAISE EXCEPTION 'Proposed transaction % is already declined', p_transaction_id;
  END IF;

  -- Verify ownership
  IF NOT EXISTS (
    SELECT 1
    FROM public.vault_owners
    WHERE vault_id = v_vault_id
      AND owner_address = v_address
  ) THEN
    RAISE EXCEPTION 'User % is not owner of vault %', v_address, v_vault_id;
  END IF;

  -- Upsert signature (approval or decline)
  INSERT INTO public.signatures (
    owner_address,
    transaction_id,
    signature
  )
  VALUES (
    v_address,
    p_transaction_id,
    p_signature
  )
  ON CONFLICT (owner_address, transaction_id)
  DO UPDATE SET
    signature = EXCLUDED.signature,
    updated_at = now();

  -- Fetch threshold
  SELECT threshold
  INTO v_threshold
  FROM public.vaults
  WHERE id = v_vault_id;

  IF v_threshold IS NULL THEN
    RAISE EXCEPTION 'Vault % has no threshold defined', v_vault_id;
  END IF;

  -- Total weight of all owners
  SELECT COALESCE(SUM(weight), 0)
  INTO v_total_weight
  FROM public.vault_owners
  WHERE vault_id = v_vault_id;

  -- Weight of declined owners
  SELECT COALESCE(SUM(vo.weight), 0)
  INTO v_decline_weight
  FROM public.signatures s
  JOIN public.vault_owners vo
    ON vo.owner_address = s.owner_address
   AND vo.vault_id = v_vault_id
  WHERE s.transaction_id = p_transaction_id
    AND s.signature IS NULL;

  v_remaining_weight := v_total_weight - v_decline_weight;

  -- Early-fail condition: threshold can never be reached anymore
  IF v_remaining_weight < v_threshold THEN
    UPDATE public.proposed_transactions
    SET declined_at = now()
    WHERE id = p_transaction_id;
  END IF;

END;
$$;


ALTER FUNCTION "public"."set_approval"("p_transaction_id" bigint, "p_signature" "bytea") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_vault_name"("p_vault_id" bigint, "p_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_address  TEXT;
  v_is_owner BOOLEAN;
BEGIN
  -- Read caller address from JWT
  v_address := lower(auth.jwt() ->> 'sub');

  IF v_address IS NULL THEN
    RAISE EXCEPTION 'JWT sub (address) missing';
  END IF;

  IF p_name IS NULL OR length(btrim(p_name)) = 0 THEN
    RAISE EXCEPTION 'Vault name must not be empty';
  END IF;

  -- Check owner status (ONLY owners allowed)
  SELECT EXISTS (
    SELECT 1
    FROM public.vault_owners vo
    WHERE vo.vault_id = p_vault_id
      AND lower(vo.owner_address) = v_address
  )
  INTO v_is_owner;

  IF NOT v_is_owner THEN
    RAISE EXCEPTION 'User % is not an owner of vault %', v_address, p_vault_id;
  END IF;

  -- Update vault name + updated_at
  UPDATE public.vaults v
  SET
    name = btrim(p_name),
    updated_at = now()
  WHERE v.id = p_vault_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Vault % not found', p_vault_id;
  END IF;
END;
$$;


ALTER FUNCTION "public"."update_vault_name"("p_vault_id" bigint, "p_name" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_events" (
    "id" bigint NOT NULL,
    "event_type" "text" NOT NULL,
    "vault_id" bigint,
    "transaction_id" bigint,
    "actor_address" "text",
    "subject_address" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."audit_events" OWNER TO "postgres";


ALTER TABLE "public"."audit_events" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."audit_events_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."owners" (
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "address" "text" NOT NULL,
    "public_key" "text"
);


ALTER TABLE "public"."owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."proposed_transactions" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "vault_id" bigint NOT NULL,
    "proposed_by" "text" NOT NULL,
    "transaction_payload" "bytea" NOT NULL,
    "comment" "text",
    "executed_by" "text",
    "transaction_digest" "text",
    "executed_at" timestamp with time zone,
    "declined_at" timestamp with time zone
);


ALTER TABLE "public"."proposed_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."proposed_transactions" IS 'This table contains all proposed transactions linked with their corresponding vaults.';



ALTER TABLE "public"."proposed_transactions" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."proposed_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."signatures" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "owner_address" "text" NOT NULL,
    "transaction_id" bigint NOT NULL,
    "signature" "bytea"
);


ALTER TABLE "public"."signatures" OWNER TO "postgres";


COMMENT ON TABLE "public"."signatures" IS 'Signatures for proposed transactions';



CREATE TABLE IF NOT EXISTS "public"."vault_owners" (
    "owner_address" "text" NOT NULL,
    "vault_id" bigint NOT NULL,
    "weight" smallint NOT NULL,
    "status" "text" DEFAULT ''::"text" NOT NULL,
    "id" bigint NOT NULL
);


ALTER TABLE "public"."vault_owners" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vault_whitelist" (
    "whitelist_address" "text" NOT NULL,
    "vault_id" bigint NOT NULL,
    "id" bigint NOT NULL
);


ALTER TABLE "public"."vault_whitelist" OWNER TO "postgres";


COMMENT ON TABLE "public"."vault_whitelist" IS 'A whitelist of users that are allowed to propose to a vault';



CREATE OR REPLACE VIEW "public"."proposed_transactions_of_current_user" AS
 WITH "owner_map" AS (
         SELECT "vo"."vault_id",
            "vo"."owner_address"
           FROM "public"."vault_owners" "vo"
        ), "signature_map" AS (
         SELECT "s"."transaction_id",
            "s"."owner_address",
            "s"."signature",
            "s"."id" AS "signature_id"
           FROM "public"."signatures" "s"
        ), "jwt_user" AS (
         SELECT "lower"(("auth"."jwt"() ->> 'sub'::"text")) AS "addr"
        )
 SELECT "pt"."id",
    "pt"."created_at",
    "pt"."executed_at",
    "pt"."declined_at",
    "pt"."vault_id",
    "pt"."proposed_by",
    "pt"."transaction_payload",
    "pt"."comment",
    "pt"."executed_by",
    "pt"."transaction_digest",
    COALESCE("array_agg"("om"."owner_address") FILTER (WHERE ("sm"."signature" IS NOT NULL)), '{}'::"text"[]) AS "approvals",
    COALESCE("array_agg"("om"."owner_address") FILTER (WHERE (("sm"."signature" IS NULL) AND ("sm"."signature_id" IS NOT NULL))), '{}'::"text"[]) AS "rejections",
    COALESCE("array_agg"("om"."owner_address") FILTER (WHERE ("sm"."signature_id" IS NULL)), '{}'::"text"[]) AS "pending"
   FROM (("public"."proposed_transactions" "pt"
     JOIN "owner_map" "om" ON (("om"."vault_id" = "pt"."vault_id")))
     LEFT JOIN "signature_map" "sm" ON ((("sm"."transaction_id" = "pt"."id") AND ("lower"("sm"."owner_address") = "lower"("om"."owner_address")))))
  WHERE ((EXISTS ( SELECT 1
           FROM "public"."vault_owners" "vo2",
            "jwt_user" "ju"
          WHERE (("vo2"."vault_id" = "pt"."vault_id") AND ("lower"("vo2"."owner_address") = "ju"."addr")))) OR (EXISTS ( SELECT 1
           FROM "public"."vault_whitelist" "vw",
            "jwt_user" "ju"
          WHERE (("vw"."vault_id" = "pt"."vault_id") AND ("lower"("vw"."whitelist_address") = "ju"."addr")))))
  GROUP BY "pt"."id", "pt"."created_at", "pt"."executed_at", "pt"."declined_at", "pt"."vault_id", "pt"."proposed_by", "pt"."transaction_payload", "pt"."comment", "pt"."executed_by", "pt"."transaction_digest"
  ORDER BY "pt"."id" DESC;


ALTER VIEW "public"."proposed_transactions_of_current_user" OWNER TO "postgres";


ALTER TABLE "public"."signatures" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."signatures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."vault_owners" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vault_owners_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."vault_whitelist" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vault_whitelist_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."vaults" (
    "created_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp without time zone DEFAULT "now"() NOT NULL,
    "threshold" smallint NOT NULL,
    "name" "text" NOT NULL,
    "creator_address" "text" NOT NULL,
    "id" bigint NOT NULL,
    "network" "public"."network" NOT NULL
);


ALTER TABLE "public"."vaults" OWNER TO "postgres";


ALTER TABLE "public"."vaults" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."vaults_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE OR REPLACE VIEW "public"."vaults_of_current_user" AS
 SELECT "id",
    "name",
    "threshold",
    COALESCE(( SELECT "jsonb_agg"("s"."obj" ORDER BY "s"."id") AS "jsonb_agg"
           FROM ( SELECT "vo"."id",
                    "jsonb_build_object"('address', "o"."address", 'public_key', "o"."public_key", 'weight', "vo"."weight", 'status', "vo"."status") AS "obj"
                   FROM ("public"."vault_owners" "vo"
                     JOIN "public"."owners" "o" ON (("lower"("o"."address") = "lower"("vo"."owner_address"))))
                  WHERE ("vo"."vault_id" = "v"."id")) "s"), '[]'::"jsonb") AS "owners",
    COALESCE(( SELECT "jsonb_agg"("jsonb_build_object"('address', "vw"."whitelist_address")) AS "jsonb_agg"
           FROM "public"."vault_whitelist" "vw"
          WHERE ("vw"."vault_id" = "v"."id")), '[]'::"jsonb") AS "whitelist",
    "creator_address",
    "network"
   FROM "public"."vaults" "v"
  WHERE ((EXISTS ( SELECT 1
           FROM "public"."vault_owners" "vo2"
          WHERE (("vo2"."vault_id" = "v"."id") AND ("lower"("vo2"."owner_address") = "lower"(("auth"."jwt"() ->> 'sub'::"text")))))) OR (EXISTS ( SELECT 1
           FROM "public"."vault_whitelist" "vw2"
          WHERE (("vw2"."vault_id" = "v"."id") AND ("lower"("vw2"."whitelist_address") = "lower"(("auth"."jwt"() ->> 'sub'::"text")))))));


ALTER VIEW "public"."vaults_of_current_user" OWNER TO "postgres";


ALTER TABLE ONLY "public"."audit_events"
    ADD CONSTRAINT "audit_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_address_key" UNIQUE ("address");



ALTER TABLE ONLY "public"."owners"
    ADD CONSTRAINT "owners_pkey" PRIMARY KEY ("address");



ALTER TABLE ONLY "public"."proposed_transactions"
    ADD CONSTRAINT "proposed_transactions_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."proposed_transactions"
    ADD CONSTRAINT "proposed_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_owners"
    ADD CONSTRAINT "vault_owners_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."vault_owners"
    ADD CONSTRAINT "vault_owners_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vault_whitelist"
    ADD CONSTRAINT "vault_whitelist_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."vault_whitelist"
    ADD CONSTRAINT "vault_whitelist_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vaults"
    ADD CONSTRAINT "vaults_id_key" UNIQUE ("id");



ALTER TABLE ONLY "public"."vaults"
    ADD CONSTRAINT "vaults_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_vault_log_vault_id" ON "public"."audit_events" USING "btree" ("vault_id");



CREATE INDEX "idx_vault_owners_lookup" ON "public"."vault_owners" USING "btree" ("vault_id", "owner_address");



CREATE INDEX "idx_vault_owners_owner_address" ON "public"."vault_owners" USING "btree" ("owner_address");



CREATE INDEX "idx_vault_owners_vault_id" ON "public"."vault_owners" USING "btree" ("vault_id");



CREATE INDEX "idx_vault_whitelist_lookup" ON "public"."vault_whitelist" USING "btree" ("vault_id", "whitelist_address");



CREATE UNIQUE INDEX "signatures_unique_owner_tx" ON "public"."signatures" USING "btree" ("owner_address", "transaction_id");



CREATE INDEX "vault_whitelist_owner_address_idx" ON "public"."vault_whitelist" USING "btree" ("whitelist_address");



CREATE INDEX "vault_whitelist_vault_id_idx" ON "public"."vault_whitelist" USING "btree" ("vault_id");



CREATE OR REPLACE TRIGGER "owner_status_change" AFTER UPDATE ON "public"."vault_owners" FOR EACH ROW EXECUTE FUNCTION "public"."log_owner_status_change"();



CREATE OR REPLACE TRIGGER "signature_change" AFTER INSERT OR UPDATE ON "public"."signatures" FOR EACH ROW EXECUTE FUNCTION "public"."log_signature_change"();



CREATE OR REPLACE TRIGGER "tx_executed" AFTER UPDATE ON "public"."proposed_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."log_tx_executed"();



CREATE OR REPLACE TRIGGER "tx_proposed" AFTER INSERT ON "public"."proposed_transactions" FOR EACH ROW EXECUTE FUNCTION "public"."log_tx_proposed"();



CREATE OR REPLACE TRIGGER "vault_created" AFTER INSERT ON "public"."vaults" FOR EACH ROW EXECUTE FUNCTION "public"."log_vault_created"();



CREATE OR REPLACE TRIGGER "vault_name_updated" AFTER UPDATE ON "public"."vaults" FOR EACH ROW EXECUTE FUNCTION "public"."log_vault_name_updated"();



CREATE OR REPLACE TRIGGER "whitelist_added" AFTER INSERT ON "public"."vault_whitelist" FOR EACH ROW EXECUTE FUNCTION "public"."log_whitelist_added"();



CREATE OR REPLACE TRIGGER "whitelist_removed" AFTER DELETE ON "public"."vault_whitelist" FOR EACH ROW EXECUTE FUNCTION "public"."log_whitelist_removed"();



ALTER TABLE ONLY "public"."proposed_transactions"
    ADD CONSTRAINT "proposed_transactions_executed_by_fkey" FOREIGN KEY ("executed_by") REFERENCES "public"."owners"("address") ON UPDATE RESTRICT ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."proposed_transactions"
    ADD CONSTRAINT "proposed_transactions_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON UPDATE RESTRICT ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_owner_address_fkey" FOREIGN KEY ("owner_address") REFERENCES "public"."owners"("address") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."signatures"
    ADD CONSTRAINT "signatures_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."proposed_transactions"("id") ON UPDATE CASCADE ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_owners"
    ADD CONSTRAINT "vault_owners_owner_address_fkey" FOREIGN KEY ("owner_address") REFERENCES "public"."owners"("address");



ALTER TABLE ONLY "public"."vault_owners"
    ADD CONSTRAINT "vault_owners_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vault_whitelist"
    ADD CONSTRAINT "vault_whitelist_owner_address_fkey" FOREIGN KEY ("whitelist_address") REFERENCES "public"."owners"("address");



ALTER TABLE ONLY "public"."vault_whitelist"
    ADD CONSTRAINT "vault_whitelist_vault_id_fkey" FOREIGN KEY ("vault_id") REFERENCES "public"."vaults"("id") ON DELETE CASCADE;



CREATE POLICY "Allo Read of vault logs for owner and whitelisted users only" ON "public"."audit_events" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."vault_owners" "vo"
  WHERE (("vo"."vault_id" = "audit_events"."vault_id") AND ("vo"."owner_address" = ("auth"."jwt"() ->> 'sub'::"text"))))));



CREATE POLICY "Allow insert for own vaults only" ON "public"."vaults" FOR INSERT WITH CHECK (("creator_address" = ("auth"."jwt"() ->> 'sub'::"text")));



CREATE POLICY "Allow insert only for own vault and if not already owner or whi" ON "public"."vault_whitelist" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."vault_owners" "vo"
  WHERE (("vo"."vault_id" = "vault_whitelist"."vault_id") AND ("lower"("vo"."owner_address") = "lower"(("auth"."jwt"() ->> 'sub'::"text")))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."vault_owners" "vo2"
  WHERE (("vo2"."vault_id" = "vault_whitelist"."vault_id") AND ("lower"("vo2"."owner_address") = "lower"("vault_whitelist"."whitelist_address")))))) AND (NOT (EXISTS ( SELECT 1
   FROM "public"."vault_whitelist" "vw"
  WHERE (("vw"."vault_id" = "vault_whitelist"."vault_id") AND ("lower"("vw"."whitelist_address") = "lower"("vault_whitelist"."whitelist_address"))))))));



CREATE POLICY "Allow read for all" ON "public"."vault_owners" FOR SELECT USING (true);



CREATE POLICY "Allow update for authenticated users only" ON "public"."owners" FOR UPDATE TO "authenticated" USING ((( SELECT ("auth"."jwt"() ->> 'sub'::"text")) = "address"));



CREATE POLICY "Enable read access for all users" ON "public"."vaults" FOR SELECT USING (true);



CREATE POLICY "Enable users to add their own data only" ON "public"."owners" FOR INSERT WITH CHECK ((( SELECT ("auth"."jwt"() ->> 'sub'::"text")) = "address"));



CREATE POLICY "Enable users to view all data" ON "public"."owners" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Read only own vault proposed transactions" ON "public"."proposed_transactions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."vault_owners" "vo"
  WHERE (("vo"."vault_id" = "proposed_transactions"."vault_id") AND ("vo"."owner_address" = ("auth"."jwt"() ->> 'sub'::"text"))))));



ALTER TABLE "public"."audit_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."owners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."proposed_transactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."signatures" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_owners" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vault_whitelist" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vaults" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."add_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_vault_invitation"("p_users" "jsonb", "p_threshold" smallint, "p_name" "text", "p_networks" "public"."network"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."create_vault_invitation"("p_users" "jsonb", "p_threshold" smallint, "p_name" "text", "p_networks" "public"."network"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_vault_invitation"("p_users" "jsonb", "p_threshold" smallint, "p_name" "text", "p_networks" "public"."network"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_execute_transaction_data"("p_proposed_transaction_id" bigint) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_execute_transaction_data"("p_proposed_transaction_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."get_execute_transaction_data"("p_proposed_transaction_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."log_owner_status_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_owner_status_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_owner_status_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_signature_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_signature_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_signature_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_tx_executed"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_tx_executed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_tx_executed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_tx_proposed"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_tx_proposed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_tx_proposed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_vault_created"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_vault_created"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_vault_created"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_vault_name_updated"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_vault_name_updated"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_vault_name_updated"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_whitelist_added"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_whitelist_added"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_whitelist_added"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_whitelist_removed"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_whitelist_removed"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_whitelist_removed"() TO "service_role";



GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text", "p_signature" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text", "p_signature" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."propose_transaction"("p_vault_id" bigint, "p_transaction_data" "bytea", "p_comment" "text", "p_signature" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."remove_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."remove_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."remove_vault_whitelist_address"("p_vault_id" bigint, "p_whitelist_address" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."respond_to_vault_invitation"("p_vault_id" bigint, "p_status" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."respond_to_vault_invitation"("p_vault_id" bigint, "p_status" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."respond_to_vault_invitation"("p_vault_id" bigint, "p_status" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_approval"("p_transaction_id" bigint, "p_signature" "bytea") TO "anon";
GRANT ALL ON FUNCTION "public"."set_approval"("p_transaction_id" bigint, "p_signature" "bytea") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_approval"("p_transaction_id" bigint, "p_signature" "bytea") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_vault_name"("p_vault_id" bigint, "p_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_vault_name"("p_vault_id" bigint, "p_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_vault_name"("p_vault_id" bigint, "p_name" "text") TO "service_role";



GRANT ALL ON TABLE "public"."audit_events" TO "anon";
GRANT ALL ON TABLE "public"."audit_events" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_events" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_events_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_events_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_events_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."owners" TO "anon";
GRANT ALL ON TABLE "public"."owners" TO "authenticated";
GRANT ALL ON TABLE "public"."owners" TO "service_role";



GRANT ALL ON TABLE "public"."proposed_transactions" TO "anon";
GRANT ALL ON TABLE "public"."proposed_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."proposed_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."proposed_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."proposed_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."proposed_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."signatures" TO "anon";
GRANT ALL ON TABLE "public"."signatures" TO "authenticated";
GRANT ALL ON TABLE "public"."signatures" TO "service_role";



GRANT SELECT("id") ON TABLE "public"."signatures" TO "authenticated";



GRANT SELECT("created_at") ON TABLE "public"."signatures" TO "authenticated";



GRANT SELECT("updated_at") ON TABLE "public"."signatures" TO "authenticated";



GRANT SELECT("owner_address") ON TABLE "public"."signatures" TO "authenticated";



GRANT SELECT("transaction_id") ON TABLE "public"."signatures" TO "authenticated";



GRANT ALL ON TABLE "public"."vault_owners" TO "anon";
GRANT ALL ON TABLE "public"."vault_owners" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_owners" TO "service_role";



GRANT ALL ON TABLE "public"."vault_whitelist" TO "anon";
GRANT ALL ON TABLE "public"."vault_whitelist" TO "authenticated";
GRANT ALL ON TABLE "public"."vault_whitelist" TO "service_role";



GRANT ALL ON TABLE "public"."proposed_transactions_of_current_user" TO "anon";
GRANT ALL ON TABLE "public"."proposed_transactions_of_current_user" TO "authenticated";
GRANT ALL ON TABLE "public"."proposed_transactions_of_current_user" TO "service_role";



GRANT ALL ON SEQUENCE "public"."signatures_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."signatures_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."signatures_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vault_owners_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vault_owners_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vault_owners_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vault_whitelist_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vault_whitelist_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vault_whitelist_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vaults" TO "anon";
GRANT ALL ON TABLE "public"."vaults" TO "authenticated";
GRANT ALL ON TABLE "public"."vaults" TO "service_role";



GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."vaults_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."vaults_of_current_user" TO "anon";
GRANT ALL ON TABLE "public"."vaults_of_current_user" TO "authenticated";
GRANT ALL ON TABLE "public"."vaults_of_current_user" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







