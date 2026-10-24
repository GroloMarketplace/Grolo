-- Allow automatic moderation reports created by the Block User action.
alter table public.reports drop constraint if exists reports_reason_check;
alter table public.reports add constraint reports_reason_check check (reason in ('spam', 'harassment_bullying', 'hate_speech', 'fraud_scam', 'explicit_inappropriate', 'illegal_goods_services', 'other', 'user_blocked'));

notify pgrst, 'reload schema';
