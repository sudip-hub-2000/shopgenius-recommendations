import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { formatPrice } from "@/lib/format";
import { Users, ShoppingBag, MousePointerClick, Search, Heart, ShoppingCart } from "lucide-react";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
});

type EventRow = { event_type: string; created_at: string; query: string | null };
type OrderRow = { id: string; user_id: string; total: number; status: string; created_at: string };
type ProfileRow = { id: string; display_name: string | null; created_at: string };

function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data ?? [];
    },
  });

  const orders = useQuery({
    queryKey: ["admin-orders"],
    enabled: isAdmin,
    queryFn: async (): Promise<OrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, user_id, total, status, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

  const events = useQuery({
    queryKey: ["admin-events"],
    enabled: isAdmin,
    queryFn: async (): Promise<EventRow[]> => {
      const { data, error } = await supabase
        .from("product_events")
        .select("event_type, created_at, query")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as EventRow[];
    },
  });

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-10"><Skeleton className="h-40 w-full" /></div>;
  }
  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Sign in required</h1>
        <p className="mt-2 text-muted-foreground">Please sign in with an admin account.</p>
        <Link to="/login" className="mt-4 inline-block rounded-md bg-gradient-violet px-4 py-2 text-white">Go to login</Link>
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Forbidden</h1>
        <p className="mt-2 text-muted-foreground">You do not have admin access.</p>
      </div>
    );
  }

  const evs = events.data ?? [];
  const evCount = (t: string) => evs.filter((e) => e.event_type === t).length;
  const totalRevenue = (orders.data ?? []).reduce((s, o) => s + Number(o.total), 0);

  const topSearches = Object.entries(
    evs
      .filter((e) => e.event_type === "search" && e.query)
      .reduce<Record<string, number>>((acc, e) => {
        acc[e.query!] = (acc[e.query!] ?? 0) + 1;
        return acc;
      }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const stats = [
    { label: "Users", value: profiles.data?.length ?? 0, icon: Users },
    { label: "Orders", value: orders.data?.length ?? 0, icon: ShoppingBag },
    { label: "Revenue", value: formatPrice(totalRevenue), icon: ShoppingBag },
    { label: "Clicks", value: evCount("click"), icon: MousePointerClick },
    { label: "Searches", value: evCount("search"), icon: Search },
    { label: "Wishlist adds", value: evCount("wishlist_add"), icon: Heart },
    { label: "Cart adds", value: evCount("cart_add"), icon: ShoppingCart },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">TechNova Admin</h1>
        <p className="text-muted-foreground">User management & analytics dashboard</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-7">
        {stats.map((s) => (
          <Card key={s.label} className="bg-gradient-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top search queries</CardTitle></CardHeader>
          <CardContent>
            {topSearches.length === 0 ? (
              <p className="text-sm text-muted-foreground">No searches yet.</p>
            ) : (
              <ul className="space-y-2">
                {topSearches.map(([q, n]) => (
                  <li key={q} className="flex justify-between text-sm">
                    <span className="truncate">{q}</span>
                    <span className="font-mono text-primary">{n}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders.data ?? []).slice(0, 8).map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                    <TableCell><span className="rounded bg-primary/20 px-2 py-0.5 text-xs">{o.status}</span></TableCell>
                    <TableCell className="text-right">{formatPrice(Number(o.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Users</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User ID</TableHead>
                <TableHead>Display name</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(profiles.data ?? []).map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}…</TableCell>
                  <TableCell>{p.display_name ?? "—"}</TableCell>
                  <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
