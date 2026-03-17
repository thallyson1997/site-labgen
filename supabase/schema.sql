-- Tabelas base
create table if not exists public.modulos (
  id smallint primary key,
  nome text not null,
  capacidade_total integer not null check (capacidade_total > 0),
  inscritos integer not null default 0 check (inscritos >= 0)
);

insert into public.modulos (id, nome, capacidade_total, inscritos)
values
  (1, 'Modulo 1', 20, 0),
  (2, 'Modulo 2', 20, 0),
  (3, 'Modulo 3', 20, 0)
on conflict (id) do update
set
  nome = excluded.nome,
  capacidade_total = excluded.capacidade_total;

create table if not exists public.inscricoes (
  id bigserial primary key,
  nome text not null,
  telefone text not null,
  email text not null unique,
  modulo_id smallint not null references public.modulos(id),
  comprovante_path text not null,
  criado_em timestamptz not null default now()
);

create index if not exists idx_inscricoes_modulo_id on public.inscricoes(modulo_id);

-- Bucket para comprovantes (privado)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes',
  'comprovantes',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']::text[]
)
on conflict (id) do update
set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types,
  public = excluded.public;

-- Funcao de inscricao com lock para respeitar limite por modulo
create or replace function public.inscrever_aluno(
  p_nome text,
  p_telefone text,
  p_email text,
  p_modulo_id smallint,
  p_comprovante_path text
)
returns json
language plpgsql
as $$
declare
  v_capacidade integer;
  v_inscritos integer;
  v_inscricao_id bigint;
begin
  if p_nome is null or btrim(p_nome) = '' then
    raise exception 'Nome obrigatorio';
  end if;

  if p_telefone is null or btrim(p_telefone) = '' then
    raise exception 'Telefone obrigatorio';
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception 'Email obrigatorio';
  end if;

  if p_comprovante_path is null or btrim(p_comprovante_path) = '' then
    raise exception 'Comprovante obrigatorio';
  end if;

  select capacidade_total, inscritos
    into v_capacidade, v_inscritos
  from public.modulos
  where id = p_modulo_id
  for update;

  if not found then
    raise exception 'Modulo invalido';
  end if;

  if v_inscritos >= v_capacidade then
    raise exception 'Modulo lotado';
  end if;

  insert into public.inscricoes (
    nome,
    telefone,
    email,
    modulo_id,
    comprovante_path
  )
  values (
    btrim(p_nome),
    btrim(p_telefone),
    lower(btrim(p_email)),
    p_modulo_id,
    btrim(p_comprovante_path)
  )
  returning id into v_inscricao_id;

  update public.modulos
    set inscritos = inscritos + 1
  where id = p_modulo_id;

  return json_build_object(
    'ok', true,
    'inscricao_id', v_inscricao_id,
    'modulo_id', p_modulo_id
  );
exception
  when unique_violation then
    raise exception 'Email ja cadastrado';
end;
$$;
