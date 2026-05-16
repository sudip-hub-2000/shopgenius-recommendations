import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";
import type { CartItem } from "@/lib/types";
import { toast } from "sonner";

const KEY = ["cart"];

export function useCart() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: KEY,
    enabled: !!user,
    queryFn: async (): Promise<CartItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("cart_items")
        .select("id, product_id, quantity, product:products(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data as unknown as CartItem[]) ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async (productId: string) => {
      if (!user) throw new Error("Please sign in to add to cart");
      const existing = query.data?.find((i) => i.product_id === productId);
      if (existing) {
        const { error } = await supabase
          .from("cart_items")
          .update({ quantity: existing.quantity + 1 })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("cart_items")
          .insert({ user_id: user.id, product_id: productId, quantity: 1 });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Added to cart");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateQty = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      if (quantity <= 0) {
        const { error } = await supabase.from("cart_items").delete().eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cart_items").update({ quantity }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cart_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Removed from cart");
    },
  });

  const items = query.data ?? [];
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const subtotal = items.reduce(
    (s, i) => s + (i.product.discount_price ?? i.product.price) * i.quantity,
    0,
  );

  return { items, count, subtotal, loading: query.isLoading, add, updateQty, remove };
}
