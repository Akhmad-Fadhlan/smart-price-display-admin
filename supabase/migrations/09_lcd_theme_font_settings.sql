-- Migration 09: LCD Theme & Per-Element Font Settings
-- Adds: theme, product_font_color, product_font_size, price_font_color, price_font_size
-- to display_configs table, and updates related RPC functions.

-- ===== 1. ADD NEW COLUMNS TO display_configs =====

alter table public.display_configs
  add column if not exists theme               text    default 'midnight_circuit',
  add column if not exists product_font_color  text    default '#ffffff'
                           check (product_font_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists product_font_size   font_size default 'large',
  add column if not exists price_font_color    text    default '#fde047'
                           check (price_font_color ~ '^#[0-9a-fA-F]{6}$'),
  add column if not exists price_font_size     font_size default 'xlarge';

-- ===== 2. VALID THEME IDs CONSTRAINT =====

alter table public.display_configs
  add constraint chk_theme_valid check (
    theme in (
      'midnight_circuit',
      'golden_luxury',
      'neon_tokyo',
      'emerald_forest',
      'sakura_dream',
      'arctic_frost',
      'ocean_depth',
      'crimson_royal',
      'cosmic_galaxy',
      'retro_amber'
    )
  );

-- ===== 3. UPDATE RPC: create_display_profile =====
-- Includes new fields: theme, product_font_color, product_font_size,
--                      price_font_color, price_font_size

create or replace function public.create_display_profile(
  p_name text, p_description text, p_config jsonb,
  p_created_by uuid, p_owner_device_id uuid default null)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  insert into display_profiles (name, description, created_by, is_custom, owner_device_id)
  values (p_name, p_description, p_created_by, p_owner_device_id is not null, p_owner_device_id)
  returning id into v_id;

  insert into display_configs (
    display_profile_id,
    product_name, price, unit, promo_text,
    font_size, font_weight, alignment,
    brightness, rotation, layout_config,
    theme, product_font_color, product_font_size,
    price_font_color, price_font_size
  )
  values (
    v_id,
    p_config->>'product_name',
    (p_config->>'price')::int,
    nullif(p_config->>'unit', ''),
    nullif(p_config->>'promo_text', ''),
    (p_config->>'font_size')::font_size,
    p_config->>'font_weight',
    (p_config->>'alignment')::text_align,
    (p_config->>'brightness')::smallint,
    (p_config->>'rotation')::smallint,
    p_config->'layout_config',
    coalesce(nullif(p_config->>'theme', ''), 'midnight_circuit'),
    coalesce(nullif(p_config->>'product_font_color', ''), '#ffffff'),
    coalesce(nullif(p_config->>'product_font_size', ''), 'large')::font_size,
    coalesce(nullif(p_config->>'price_font_color', ''), '#fde047'),
    coalesce(nullif(p_config->>'price_font_size', ''), 'xlarge')::font_size
  );

  return v_id;
end $$;

-- ===== 4. UPDATE RPC: update_display_config (Optimistic Locking BR-09) =====

create or replace function public.update_display_config(
  p_profile_id uuid, p_expected_version int, p_config jsonb)
returns int language plpgsql as $$
declare v_version int;
begin
  select version into v_version from display_profiles where id = p_profile_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if v_version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;

  update display_configs set
    product_name        = p_config->>'product_name',
    price               = (p_config->>'price')::int,
    unit                = nullif(p_config->>'unit', ''),
    promo_text          = nullif(p_config->>'promo_text', ''),
    font_size           = (p_config->>'font_size')::font_size,
    font_weight         = p_config->>'font_weight',
    alignment           = (p_config->>'alignment')::text_align,
    brightness          = (p_config->>'brightness')::smallint,
    rotation            = (p_config->>'rotation')::smallint,
    layout_config       = p_config->'layout_config',
    theme               = coalesce(nullif(p_config->>'theme', ''), 'midnight_circuit'),
    product_font_color  = coalesce(nullif(p_config->>'product_font_color', ''), '#ffffff'),
    product_font_size   = coalesce(nullif(p_config->>'product_font_size', ''), 'large')::font_size,
    price_font_color    = coalesce(nullif(p_config->>'price_font_color', ''), '#fde047'),
    price_font_size     = coalesce(nullif(p_config->>'price_font_size', ''), 'xlarge')::font_size,
    updated_at          = now()
  where display_profile_id = p_profile_id;

  select version into v_version from display_profiles where id = p_profile_id;
  return v_version;
end $$;

-- ===== 5. COMMENT COLUMNS =====

comment on column public.display_configs.theme
  is 'LCD background theme ID (references LCD_THEMES in themes.ts)';
comment on column public.display_configs.product_font_color
  is 'Hex color for product name text (e.g. #ffffff)';
comment on column public.display_configs.product_font_size
  is 'Font size preset for product name, overrides global font_size';
comment on column public.display_configs.price_font_color
  is 'Hex color for price text (e.g. #fde047)';
comment on column public.display_configs.price_font_size
  is 'Font size preset for price, overrides global font_size';
