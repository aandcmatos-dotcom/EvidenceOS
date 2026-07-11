-- ============================================================================
-- Evidence OS — Phase 5: seed built-in document templates
-- Run in Supabase SQL Editor. Idempotent (checks by name before inserting).
-- ============================================================================

do $$
declare
  tpl_id uuid;
  seed record;
begin
  for seed in
    select * from (values
      ('Neutral Parenting Communication', 'Parenting Communication',
       'A calm, factual message to a co-parent. Organizes your points without emotional language.'),
      ('Declaration / Affidavit', 'Declaration / Affidavit',
       'Numbered declaration format with caption, statements, and signature block.'),
      ('Factual Chronology', 'Chronology',
       'Date-ordered table of events with linked evidence and source indicators.'),
      ('Exhibit List', 'Exhibit List',
       'Numbered exhibit index with descriptions and document dates.'),
      ('Cover Letter to Clerk', 'Letter',
       'Simple transmittal letter. You supply the recipient and purpose.'),
      ('Hearing Preparation Outline', 'Hearing Outline',
       'Structured outline of points, supporting evidence, and questions for a hearing.')
    ) as t(name, category, description)
  loop
    if not exists (select 1 from public.document_templates where name = seed.name and built_in = true) then
      insert into public.document_templates (name, category, description, built_in, owner_id)
      values (seed.name, seed.category, seed.description, true, null)
      returning id into tpl_id;

      insert into public.template_variables (template_id, key, label, required, question, var_type)
      values
        (tpl_id, 'case.case_name', 'Case Name', true, null, 'text'),
        (tpl_id, 'document.date', 'Document Date', true, null, 'date'),
        (tpl_id, 'selected_events', 'Selected Timeline Events', false, 'Which events should be included?', 'multi'),
        (tpl_id, 'selected_evidence', 'Selected Evidence', false, 'Which evidence should be included?', 'multi');
    end if;
  end loop;
end $$;
