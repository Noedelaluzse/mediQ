# 11. Esquema de base de datos (PostgreSQL)

Diecinueve tablas: doce para el MVP y siete para las fases 2 y 3. Todo dato clínico cuelga de `users` y lleva `user_id`, de modo que autorizar es siempre filtrar por una columna indexada. No lo he ejecutado contra una base; corre la migración en local antes de darlo por bueno.

| Tabla | Guarda | Relación |
| --- | --- | --- |
| `users` | Cuenta ligada a Google | — |
| `sessions` | Tokens de refresco (hash) por dispositivo | N por usuario |
| `consents` | Aceptación del aviso de privacidad, por versión | N por usuario |
| `patients` | Perfiles: el propio y, después, familiares | N por usuario |
| `specialties` | Catálogo de especialidades | Global |
| `places` | Lugares de atención: hospital, clínica o consultorio, con nombre libre | N por usuario |
| `doctors` | Directorio de médicos del usuario | N por usuario; 0 o 1 lugar habitual |
| `visits` | Consultas del diario | N por paciente; 0 o 1 lugar; 0 o 1 médico |
| `visit_instructions` | Indicaciones marcables | N por consulta |
| `prescriptions` | Recetas | N por consulta |
| `prescription_items` | Medicamentos de la receta | N por receta |
| `attachments` | Fotos de la receta (solo la llave de S3) | N por receta |

```sql
create extension if not exists pgcrypto;  -- gen_random_uuid()
create extension if not exists pg_trgm;   -- búsqueda por texto

create type visit_type as enum ('general', 'especialista', 'dentista', 'urgencias', 'otro');
create type visit_mode as enum ('presencial', 'en_linea', 'domicilio');

create function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- Identidad ---------------------------------------------------------------
create table users (
  id           uuid primary key default gen_random_uuid(),
  google_sub   text not null unique,
  email        text not null,
  display_name text not null,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);
create unique index users_email_uq on users (lower(email)) where deleted_at is null;

create table sessions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references users (id) on delete cascade,
  refresh_token_hash text not null unique,
  device_name        text,
  expires_at         timestamptz not null,
  revoked_at         timestamptz,
  created_at         timestamptz not null default now()
);
create index sessions_user_idx on sessions (user_id);

create table consents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references users (id) on delete cascade,
  document    text not null,            -- 'aviso_privacidad', 'terminos'
  version     text not null,
  accepted_at timestamptz not null default now(),
  unique (user_id, document, version)
);

create table patients (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  full_name  text not null,
  birth_date date,
  is_self    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);
create unique index patients_self_uq on patients (user_id) where is_self;

-- Directorio --------------------------------------------------------------
create table specialties (
  id   smallint generated always as identity primary key,
  slug text not null unique,
  name text not null
);

-- Lugar de atención: cualquier nombre que escriba el usuario
create table places (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users (id) on delete cascade,
  name       text not null check (length(btrim(name)) > 0),  -- 'Hospital Morelos'
  address    text,
  phone      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (id, user_id)
);
-- un mismo nombre no se duplica por usuario (sin distinguir mayúsculas)
create unique index places_name_uq on places (user_id, lower(btrim(name)))
  where deleted_at is null;

create table doctors (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references users (id) on delete cascade,
  full_name      text not null,
  specialty_id   smallint references specialties (id),
  place_id       uuid,                  -- lugar habitual, opcional
  office         text,                  -- número de consultorio o piso
  phone          text,
  license_number text,                  -- cédula profesional
  notes          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (id, user_id),
  foreign key (place_id, user_id) references places (id, user_id)
);
create index doctors_user_idx on doctors (user_id, full_name) where deleted_at is null;

-- Diario ------------------------------------------------------------------
create table visits (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references users (id) on delete cascade,
  patient_id          uuid not null,
  place_id            uuid,             -- dónde fue la consulta
  doctor_id           uuid,             -- opcional: puede no conocerse
  specialty_id        smallint references specialties (id),
  visit_type          visit_type not null,
  visit_mode          visit_mode not null default 'presencial',
  visited_at          timestamptz not null,
  reason              text,
  doctor_notes        text,             -- "lo que me dijo el médico"
  next_appointment_at timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  -- paciente, lugar y médico deben ser del mismo usuario
  foreign key (patient_id, user_id) references patients (id, user_id),
  foreign key (place_id, user_id) references places (id, user_id),
  foreign key (doctor_id, user_id) references doctors (id, user_id),
  check (next_appointment_at is null or next_appointment_at > visited_at)
);
create index visits_diary_idx on visits (user_id, visited_at desc, id desc)
  where deleted_at is null;
create index visits_next_idx on visits (user_id, next_appointment_at)
  where next_appointment_at is not null and deleted_at is null;
create index visits_doctor_idx on visits (doctor_id) where deleted_at is null;
create index visits_place_idx on visits (place_id) where deleted_at is null;
create index visits_search_idx on visits
  using gin ((coalesce(reason, '') || ' ' || coalesce(doctor_notes, '')) gin_trgm_ops);

create table visit_instructions (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references visits (id) on delete cascade,
  sort_order smallint not null,
  body       text not null,
  done_at    timestamptz,
  unique (visit_id, sort_order)
);

-- Recetas -----------------------------------------------------------------
create table prescriptions (
  id         uuid primary key default gen_random_uuid(),
  visit_id   uuid not null references visits (id) on delete cascade,
  issued_on  date,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index prescriptions_visit_idx on prescriptions (visit_id);

create table prescription_items (
  id              uuid primary key default gen_random_uuid(),
  prescription_id uuid not null references prescriptions (id) on delete cascade,
  sort_order      smallint not null,
  medication_name text not null,
  dose            text,                 -- '50 mg · 1 tableta'
  frequency       text,                 -- 'cada 24 h'
  duration        text,                 -- '30 días'
  route           text,                 -- 'oral'
  instructions    text,
  remind          boolean not null default false,
  unique (prescription_id, sort_order)
);

create table attachments (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references users (id) on delete cascade,
  prescription_id uuid not null references prescriptions (id) on delete cascade,
  storage_key     text not null unique, -- llave en S3, nunca una URL pública
  mime_type       text not null,
  size_bytes      integer not null check (size_bytes > 0),
  width           integer,
  height          integer,
  created_at      timestamptz not null default now()
);
create index attachments_prescription_idx on attachments (prescription_id);

-- updated_at automático ---------------------------------------------------
create trigger users_updated         before update on users         for each row execute function set_updated_at();
create trigger patients_updated      before update on patients      for each row execute function set_updated_at();
create trigger places_updated        before update on places        for each row execute function set_updated_at();
create trigger doctors_updated       before update on doctors       for each row execute function set_updated_at();
create trigger visits_updated        before update on visits        for each row execute function set_updated_at();
create trigger prescriptions_updated before update on prescriptions for each row execute function set_updated_at();
```

**Lugar de atención.** `places` guarda el nombre tal como lo escribe el usuario, sin catálogo ni tipo fijo. Al registrar una consulta, la API busca el nombre entre los lugares del usuario y lo reutiliza o lo crea. La consulta puede tener lugar sin médico, por ejemplo un consultorio de farmacia donde no se conoce al doctor.

## Tablas de fases 2 y 3

Siete tablas y tres columnas dejan el esquema completo para todas las fases. Se crean desde la migración inicial y quedan vacías hasta que su fase las use. Va en un archivo aparte para que se vea qué es MVP y qué no.

```sql
create type device_platform     as enum ('android', 'ios');
create type user_role           as enum ('usuario', 'soporte', 'admin');
create type scan_status         as enum ('pendiente', 'procesando', 'listo', 'error');
create type item_source         as enum ('manual', 'lectura');
create type plan_code           as enum ('gratis', 'premium');
create type subscription_status as enum ('activa', 'en_gracia', 'cancelada', 'vencida');

-- Fase 2: notificaciones (RF-32, RF-40) ------------------------------------
create table devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references users (id) on delete cascade,
  platform     device_platform not null,
  push_token   text not null unique,
  timezone     text not null,            -- IANA, p. ej. 'America/Cancun'
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index devices_user_idx on devices (user_id);

create table medication_schedules (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references users (id) on delete cascade,
  prescription_item_id uuid not null references prescription_items (id) on delete cascade,
  times                time[] not null check (cardinality(times) > 0),  -- horas del día
  days_of_week         smallint[],       -- null = todos los días; 0 = domingo
  starts_on            date not null,
  ends_on              date,
  timezone             text not null,
  active               boolean not null default true,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);
create index medication_schedules_active_idx on medication_schedules (user_id) where active;
create index medication_schedules_item_idx on medication_schedules (prescription_item_id);

create table dose_logs (                 -- toma registrada u omitida
  id           uuid primary key default gen_random_uuid(),
  schedule_id  uuid not null references medication_schedules (id) on delete cascade,
  scheduled_at timestamptz not null,
  taken_at     timestamptz,
  skipped      boolean not null default false,
  unique (schedule_id, scheduled_at)
);

create table appointment_reminders (
  id        uuid primary key default gen_random_uuid(),
  user_id   uuid not null references users (id) on delete cascade,
  visit_id  uuid not null references visits (id) on delete cascade,
  remind_at timestamptz not null,
  sent_at   timestamptz,
  unique (visit_id, remind_at)
);
create index appointment_reminders_due_idx on appointment_reminders (remind_at)
  where sent_at is null;

-- Fase 2: soporte ----------------------------------------------------------
alter table users add column role user_role not null default 'usuario';

create table audit_log (                 -- quién hizo qué sobre qué cuenta
  id             bigint generated always as identity primary key,
  actor_user_id  uuid references users (id) on delete set null,
  target_user_id uuid references users (id) on delete set null,
  action         text not null,
  metadata       jsonb not null default '{}',  -- nunca contenido clínico
  created_at     timestamptz not null default now()
);
create index audit_log_target_idx on audit_log (target_user_id, created_at desc);

-- Fase 3: lectura automática de recetas (RF-61) ----------------------------
create table attachment_scans (
  id            uuid primary key default gen_random_uuid(),
  attachment_id uuid not null references attachments (id) on delete cascade,
  status        scan_status not null default 'pendiente',
  engine        text,                    -- motor y versión usados
  raw_text      text,
  result        jsonb,                   -- medicamentos propuestos
  error         text,
  created_at    timestamptz not null default now(),
  finished_at   timestamptz
);
create index attachment_scans_attachment_idx on attachment_scans (attachment_id);

alter table prescription_items
  add column source  item_source not null default 'manual',
  add column scan_id uuid references attachment_scans (id) on delete set null;

-- Fase 3: plan premium -----------------------------------------------------
create table subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references users (id) on delete cascade,
  plan                     plan_code not null,
  status                   subscription_status not null,
  provider                 text not null check (provider in ('google_play', 'app_store')),
  provider_subscription_id text not null,
  current_period_end       timestamptz not null,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (provider, provider_subscription_id)
);
-- a lo más una suscripción vigente por usuario
create unique index subscriptions_active_uq on subscriptions (user_id)
  where status in ('activa', 'en_gracia');

create trigger medication_schedules_updated before update on medication_schedules for each row execute function set_updated_at();
create trigger subscriptions_updated        before update on subscriptions        for each row execute function set_updated_at();
```

Sin suscripción vigente, el usuario está en el plan gratis; no hace falta una fila por cada usuario gratuito.

## Preparación del esquema por fase

Con las tablas anteriores, ningún requisito de las fases 2 y 3 necesita cambiar una tabla existente.

| Requisito | Fase | Soporte en el esquema |
| --- | --- | --- |
| RF-17 Búsqueda por texto, médico, especialidad | 2 | `visits_search_idx` y los índices por médico y lugar |
| RF-32 Recordatorios de toma | 2 | `medication_schedules`, `dose_logs`, `devices` |
| RF-40 Aviso de próxima cita | 2 | `visits.next_appointment_at`, `appointment_reminders`, `devices` |
| RF-50 Exportar a PDF | 2 | Lectura de las tablas del MVP |
| RF-51 Bloqueo biométrico | 2 | No usa la base; vive en el dispositivo |
| Rol de soporte | 2 | `users.role`, `audit_log` |
| RF-60 Perfiles familiares | 3 | `patients`, `visits.patient_id` |
| RF-61 Lectura automática de recetas | 3 | `attachment_scans`, `prescription_items.source` y `scan_id` |
| Plan premium | 3 | `subscriptions` |

Dos cosas quedan fuera a propósito:

- **Cifrado a nivel de aplicación** de `doctor_notes` y `reason`. Cambiaría el tipo de esas columnas y anula la búsqueda en servidor; es una decisión pendiente, no una tabla.
- **Compartir un perfil entre dos cuentas** (por ejemplo, dos hermanos que cuidan al mismo padre). RF-60 solo pide perfiles dentro de una cuenta; compartir pediría una tabla de permisos por perfil.

Decisiones del esquema:

- **`patients` desde el día uno.** En v1 cada usuario tiene un solo perfil con `is_self = true`. Los perfiles familiares de la fase 3 no requieren migrar `visits`.
- **Llaves compuestas `(id, user_id)`.** La base impide ligar una consulta a un paciente o médico de otro usuario, aunque la API tenga un error.
- **Borrado lógico** (`deleted_at`) en lo que el usuario puede querer recuperar. Eliminar la cuenta sí es borrado físico en cascada, más el borrado de los objetos en S3.
- **Dosis, frecuencia y duración como texto.** Las recetas no siguen un formato; estructurarlas antes de tener datos reales es adivinar. Los horarios de toma van aparte, en la tabla medication\_schedules.
- **Borradores fuera de PostgreSQL.** Viven en SQLite en el dispositivo hasta que se guardan.
- **`uuid` generado en servidor o en cliente.** Aceptar el id del cliente hace idempotente el reenvío de un borrador.
