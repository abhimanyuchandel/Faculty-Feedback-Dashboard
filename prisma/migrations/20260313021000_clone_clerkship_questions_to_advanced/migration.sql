WITH phase_ids AS (
  SELECT
    (
      SELECT id
      FROM curriculum_phases
      WHERE active_status = true
        AND lower(name) LIKE '%clerkship%'
        AND lower(name) NOT LIKE '%advanced%'
      ORDER BY sort_order ASC
      LIMIT 1
    ) AS clerkship_id,
    (
      SELECT id
      FROM curriculum_phases
      WHERE active_status = true
        AND lower(name) LIKE '%advanced clerkship%'
      ORDER BY sort_order ASC
      LIMIT 1
    ) AS advanced_id
),
eligible AS (
  SELECT
    sq.id,
    sq.config,
    phase_ids.advanced_id
  FROM survey_questions sq
  CROSS JOIN phase_ids
  WHERE phase_ids.clerkship_id IS NOT NULL
    AND phase_ids.advanced_id IS NOT NULL
    AND lower(trim(sq.prompt)) <> 'when did you work with this faculty?'
    AND jsonb_typeof(COALESCE(sq.config, '{}'::jsonb)->'phaseIds') = 'array'
    AND (COALESCE(sq.config, '{}'::jsonb)->'phaseIds') ? phase_ids.clerkship_id
    AND NOT ((COALESCE(sq.config, '{}'::jsonb)->'phaseIds') ? phase_ids.advanced_id)
)
UPDATE survey_questions sq
SET config = jsonb_set(
  COALESCE(sq.config, '{}'::jsonb),
  '{phaseIds}',
  (COALESCE(sq.config, '{}'::jsonb)->'phaseIds') || to_jsonb(eligible.advanced_id),
  true
)
FROM eligible
WHERE sq.id = eligible.id;
