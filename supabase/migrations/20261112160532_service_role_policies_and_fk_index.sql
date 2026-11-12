create index veyra_events_case_id on public.veyra_events (case_id);

create policy "Veyra server access only" on public.veyra_cases
  for all to service_role
  using (true)
  with check (true);

create policy "Veyra event server access only" on public.veyra_events
  for all to service_role
  using (true)
  with check (true);
