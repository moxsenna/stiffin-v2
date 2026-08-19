UPDATE "learning_events" SET "event_type" = 'lesson.completed' WHERE "event_type" = 'LESSON_COMPLETED';--> statement-breakpoint
UPDATE "learning_events" SET "event_type" = 'reflection.submitted' WHERE "event_type" = 'REFLECTION_SUBMITTED';--> statement-breakpoint
UPDATE "learning_events" SET "event_type" = 'cta.clicked' WHERE "event_type" = 'CTA_CLICKED';--> statement-breakpoint
UPDATE "learning_events" SET "event_type" = 'program.completed' WHERE "event_type" = 'PROGRAM_COMPLETED';--> statement-breakpoint
ALTER TABLE "learning_events" DROP CONSTRAINT IF EXISTS "learning_events_event_type_check";--> statement-breakpoint
ALTER TABLE "learning_events" ADD CONSTRAINT "learning_events_event_type_check" CHECK (
	"event_type" IN (
		'learner.registered',
		'learner.enrolled',
		'lesson.started',
		'lesson.completed',
		'reflection.submitted',
		'program.progress_50',
		'program.progress_80',
		'program.completed',
		'cta.viewed',
		'cta.clicked',
		'learner.inactive'
	)
);