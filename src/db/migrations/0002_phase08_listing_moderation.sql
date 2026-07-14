alter table moderation_queue
  add column if not exists payload jsonb not null default '{}'::jsonb;
