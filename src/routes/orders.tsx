import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Package, ShoppingBag, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
});

type OrderRow = {
  id: string;
  total: number;
  subtotal: number;
  shipping: number;
  tax: number;
  payment_method: string;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    product_id: string;
    product_name: string;
    product_image: string | null;
    unit_price: number;
    quantity: number;
  }[];
};

function OrdersPage() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id,total,subtotal,shipping,tax,payment_method,status,created_at,order_items(id,product_id,product_name,product_image,unit_price,quantity)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as OrderRow[]) ?? [];
    },
  });

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to view orders</h1>
        <Link to="/login">
          <Button className="mt-4 bg-gradient-violet text-white shadow-glow">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">My Orders</h1>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-2xl border border-border/40 bg-gradient-card p-12 text-center">
          <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No orders yet</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            When you place an order it will show up here.
          </p>
          <Link to="/">
            <Button className="bg-gradient-violet text-white shadow-glow">
              Start shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((order) => (
            <div
              key={order.id}
              className="overflow-hidden rounded-2xl border border-border/40 bg-gradient-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/40 px-5 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Order</p>
                    <p className="font-mono text-xs">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Placed on</p>
                    <p>
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Payment</p>
                    <p className="uppercase">{order.payment_method}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-medium capitalize text-primary">
                    {order.status}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="font-bold text-gradient">
                      {formatPrice(order.total)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border/40">
                {order.order_items.map((it) => (
                  <Link
                    key={it.id}
                    to="/product/$id"
                    params={{ id: it.product_id }}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-primary/5"
                  >
                    {it.product_image && (
                      <img
                        src={it.product_image}
                        alt=""
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{it.product_name}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty {it.quantity} · {formatPrice(it.unit_price)} each
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {formatPrice(it.unit_price * it.quantity)}
                    </p>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
