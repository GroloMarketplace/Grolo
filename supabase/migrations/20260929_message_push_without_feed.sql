-- Route message alerts through the messages webhook instead of the in-app
-- notifications feed. The deployed send-push-notification function handles
-- INSERT webhooks from public.messages and public.notifications separately.
drop trigger if exists notifications_on_message on public.messages;
drop function if exists public.notify_new_message();

notify pgrst, 'reload schema';
