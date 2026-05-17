import { supabase } from "@/integrations/supabase/client";

export type TrackEvent =
  | "view"
  | "click"
  | "search"
  | "cart_add"
  | "wishlist_add"
  | "purchase";

const WEIGHTS: Record<TrackEvent, number> = {
  view: 1,
  click: 2,
  search: 1,
  cart_add: 4,
  wishlist_add: 3,
  purchase: 6,
};

/**
 * Fire-and-forget interaction logger powering the recommendation engine.
 * Silently no-ops for signed-out users.
 */
export async function trackEvent(
  event: TrackEvent,
  opts: { productId?: string; query?: string } = {},
) {
  try {
    const { data } = await supabase.auth.getUser();
    const user = data.user;
    if (!user) return;
    await supabase.from("product_events" as never).insert({
      user_id: user.id,
      product_id: opts.productId ?? null,
      event_type: event,
      query: opts.query ?? null,
      weight: WEIGHTS[event],
    } as never);
  } catch {
    // non-critical telemetry — swallow
  }
}
