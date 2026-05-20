import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin access required");
}

export const setUserActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid(), active: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("You cannot deactivate your own account");
    }
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_active: data.active })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    // Best-effort: revoke active sessions when deactivating
    if (!data.active) {
      try {
        await supabaseAdmin.auth.admin.signOut(data.userId);
      } catch {
        // ignore — flag check on next request still blocks them
      }
    }
    return { ok: true };
  });

export const deleteUserAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ userId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error("You cannot delete your own account");
    }
    // Clean dependent rows that lack FK cascades
    const uid = data.userId;
    await supabaseAdmin.from("cart_items").delete().eq("user_id", uid);
    await supabaseAdmin.from("wishlist_items").delete().eq("user_id", uid);
    await supabaseAdmin.from("product_events").delete().eq("user_id", uid);
    await supabaseAdmin.from("search_history").delete().eq("user_id", uid);
    await supabaseAdmin.from("product_reviews").delete().eq("user_id", uid);
    await supabaseAdmin.from("feedback").delete().eq("user_id", uid);
    await supabaseAdmin.from("orders").delete().eq("user_id", uid);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", uid);
    await supabaseAdmin.from("profiles").delete().eq("id", uid);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(uid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setFeedbackStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["new", "reviewed", "resolved"]),
        admin_notes: z.string().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const patch: Record<string, unknown> = { status: data.status };
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin
      .from("feedback")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteFeedback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("feedback")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
