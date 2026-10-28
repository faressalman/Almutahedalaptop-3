# Supabase setup

1. Run `schema.sql` in the Supabase SQL Editor **after** creating the Auth user you want to manage the catalog. It assigns the newest existing Auth user as the initial admin.
2. Add these client-side environment variables in the Replit project:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (or the publishable/anon key from Supabase)
3. Keep Supabase email/password sign-in enabled. The app has no sign-up screen. Product writes are restricted by RLS to IDs in `public.admin_users`; only public product reads are allowed.
4. If the intended account was not the newest one when you ran the SQL, grant admin access from the SQL Editor:

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'YOUR_ADMIN_EMAIL'
on conflict (user_id) do nothing;
```

The anon key is intended for browser use; never place a Supabase service-role key in `VITE_*` variables.
