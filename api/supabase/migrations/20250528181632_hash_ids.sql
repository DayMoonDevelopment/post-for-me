CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION nanoid(
  prefix text,
  size int DEFAULT 21,
  alphabet text DEFAULT '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
) RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  idBuilder text := '';
  i int := 0;
  bytes bytea;
  alphabetIndex int;
  mask int;
  step int;
BEGIN
  IF prefix IS NULL OR length(prefix) = 0 THEN
    RAISE EXCEPTION 'Prefix is required';
  END IF;

  mask := (2 << floor(log(length(alphabet) - 1) / log(2))::int) - 1;
  step := ceil(1.6 * mask * size / length(alphabet));

  LOOP
    bytes := extensions.gen_random_bytes(size);
    idBuilder := '';

    FOR i IN 0..(size - 1) LOOP
      alphabetIndex := (get_byte(bytes, i) & mask) + 1;
      IF alphabetIndex <= length(alphabet) THEN
        idBuilder := idBuilder || substr(alphabet, alphabetIndex, 1);
        EXIT WHEN length(idBuilder) = size;
      END IF;
    END LOOP;

    RETURN trim(trim(prefix) || '_' || idBuilder);
  END LOOP;
END;
$$;