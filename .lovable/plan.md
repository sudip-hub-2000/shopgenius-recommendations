## 1. User Feedback Page (`/feedback`)
- New `feedback` table (id, user_id, category, subject, message, rating 1–5, status: `new|reviewed|resolved`, admin_notes, created_at).
- RLS: users insert + view their own; admins view/update/delete all.
- New route `src/routes/feedback.tsx` with a form (category dropdown, subject, message, optional star rating) using Zod validation, plus a list of the user's past submissions with status badges.
- Add "Feedback" link in Navbar (visible to signed-in non-admins) and Footer.

## 2. Admin User Management
- Add `is_active boolean default true` to `profiles`. Sign-in flow checks this flag and signs the user out with a "Your account has been deactivated" toast if false.
- Server functions (admin-gated via service-role client + `has_role` check):
  - `setUserActive({ userId, active })` — toggles `profiles.is_active`.
  - `deleteUser({ userId })` — removes the auth user (cascades cart/wishlist/orders via existing FKs where present; otherwise cleans related rows explicitly).
- Upgrade the Users table on `/admin`: add Status column, "Deactivate/Activate" and "Delete" buttons with confirm dialogs, search by name/email.

## 3. Admin Feedback Management
- New tab/section on `/admin` listing all feedback (newest first), filterable by status.
- Admin can change status (`new → reviewed → resolved`), add internal notes, and delete entries.

## 4. Restrict Admins From Shopping
- Add `useIsAdmin()` checks that block admin accounts from:
  - Adding to cart / wishlist (button shows "Admins can't shop" toast and is disabled).
  - Visiting `/cart`, `/checkout`, `/wishlist`, `/orders` — redirect to `/admin` with a toast.
- On login, if the user is an admin, redirect to `/admin` instead of `/`.
- Hide Cart / Wishlist / Orders nav items for admins; show only Admin link + Logout.

## 5. Bug Fixes & Error Handling
- Wrap all new Supabase calls in try/catch with `toast.error(...)` and friendly messages.
- Add an `errorComponent` to the new `/feedback` route and to `/admin` so failures show a retry UI instead of a blank screen.
- Ensure deactivated users can't call protected mutations: server functions re-check `is_active` before acting.
- Fix the existing admin link visibility (currently always rendered) to only show for admins.

## Technical notes
- Migrations: new `feedback` table + RLS, `profiles.is_active`, helper function `is_account_active(uuid)` used by triggers/policies as needed.
- Server functions live in `src/lib/admin.functions.ts` (thin file, only `createServerFn` exports) using `supabaseAdmin` after verifying caller has `admin` role via `requireSupabaseAuth` context.
- No new external deps; reuse existing shadcn `AlertDialog`, `Select`, `Badge`, `Tabs`.

```text
DB
├── feedback (new)
└── profiles.is_active (new column)

Routes
├── /feedback              (user)
└── /admin                 (extended: Users tab + Feedback tab)

Server fns (admin-only)
├── setUserActive
├── deleteUser
├── setFeedbackStatus
└── deleteFeedback
```
