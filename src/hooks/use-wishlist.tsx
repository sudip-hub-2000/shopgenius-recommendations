import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { WishlistItem } from "@/lib/types";
import { toast } from "sonner";

const KEY = ["wishlist"];

export function useWishlist() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async (): Promise<WishlistItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("wishlist_items")
        .select("id, product_id, product:products(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data as unknown as WishlistItem[]) ?? [];
    },
  });

  const items = query.data ?? [];
  const ids = new Set(items.map((i) => i.product_id));

  const toggle = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Please sign in to save items");
      const existing = items.find((i) => i.product_id === productId);
      if (existing) {
        const { error } = await supabase.from("wishlist_items").delete().eq("id", existing.id);
        if (error) throw error;
        return "removed";
      }
      const { error } = await supabase
        .from("wishlist_items")
        .insert({ user_id: user.id, product_id: productId });
      if (error) throw error;
      return "added";
    },
    onSuccess: (action) => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success(action === "added" ? "Added to wishlist" : "Removed from wishlist");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return { items, ids, count: items.length, loading: query.isLoading, toggle };
}
