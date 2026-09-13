alter table public.growth_events drop constraint if exists growth_events_event_name_check;

alter table public.growth_events add constraint growth_events_event_name_check check (
  event_name in (
    'diagnostic_started',
    'diagnostic_completed',
    'lesson_started',
    'lesson_completed',
    'practice_started',
    'help_requested',
    'explain_another_way',
    'similar_problem_requested',
    'full_solution_requested',
    'trial_started',
    'trial_exhausted',
    'upgrade_clicked',
    'checkout_started',
    'subscription_activated',
    'subscription_cancelled',
    'payment_failed'
  )
);
