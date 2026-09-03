create table review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references reviews(id) on delete cascade,
  url text not null,
  caption text,
  uploaded_by uuid references users(id) on delete set null,
  moderated boolean not null default false,
  created_at timestamptz not null default now()
);

create index review_media_review_id_idx on review_media (review_id);
create index review_media_uploaded_by_idx on review_media (uploaded_by);
