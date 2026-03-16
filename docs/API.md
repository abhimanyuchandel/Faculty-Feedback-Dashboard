# API Summary

## Public routes
- `GET /api/public/faculty/search?q=...`
- `GET /api/public/faculty/[publicToken]`
- `GET /api/public/surveys/active`
- `POST /api/public/feedback`
- `GET /api/digest/unsubscribe?token=...`
- `GET /api/digest/resubscribe?token=...`

## Admin routes
- `GET|POST /api/admin/faculty`
- `PATCH /api/admin/faculty/[id]`
- `POST /api/admin/faculty/[id]/deactivate`
- `POST /api/admin/faculty/[id]/reactivate`
- `POST /api/admin/faculty/import`
- `GET /api/admin/faculty/export`
- `GET /api/admin/qr/faculty/[id]`
- `GET /api/admin/feedback/overview`
- `GET|POST /api/admin/surveys`
- `POST /api/admin/surveys/[id]/questions`
- `POST /api/admin/surveys/[id]/publish`
- `POST /api/admin/surveys/[id]/reorder`
- `DELETE /api/admin/surveys/questions/[questionId]`
- `GET|POST /api/admin/sessions`
- `GET /api/admin/sessions/[id]/packet?format=single|grid`
- `POST /api/admin/digest/run`
- `GET /api/admin/digest/preview/[facultyId]`
- `POST /api/admin/digest/test/[facultyId]`

## Internal routes
- `GET|POST /api/internal/jobs/digest` (requires `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret`)
