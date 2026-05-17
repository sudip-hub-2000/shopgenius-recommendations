import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import { fetchTrendingProducts } from "@/lib/queries";
import type { Product } from "@/lib/types";

/**
 * Personalized recommendations from the server-side scoring function.
 * Falls back to trending products for signed-out / cold-start users.
 */
export function useRecommendations(limit = 12) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["recommendations", user?.id ?? "guest", limit],
    queryFn: async (): Promise<Product[]> => {
      if (!user) return fetchTrendingProducts();
      const { data, error } = await supabase.rpc(
        "get_user_recommendations" as never,
        { _user_id: user.id, _limit: limit } as never,
      );
      if (error || !data || (data as unknown[]).length === 0) {
        return fetchTrendingProducts();
      }
      return data as unknown as Product[];
    },
  });
}
