CREATE UNIQUE INDEX IF NOT EXISTS "idx_learning_events_milestone_unique"
ON "learning_events" ("enrollment_id", "event_type")
WHERE "event_type" IN (
	'program.progress_50',
	'program.progress_80',
	'program.completed',
	'learner.registered',
	'learner.enrolled'
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_learning_events_lesson_unique"
ON "learning_events" ("enrollment_id", "event_type", ("payload"->>'lessonId'))
WHERE "event_type" IN (
	'lesson.completed',
	'lesson.started',
	'reflection.submitted',
	'cta.clicked'
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_learning_signals_enrollment_reason_unique"
ON "learning_signals" ("enrollment_id", "reason")
WHERE "enrollment_id" IS NOT NULL;
