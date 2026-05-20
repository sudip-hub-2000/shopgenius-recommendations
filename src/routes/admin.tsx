import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { formatPrice } from "@/lib/format";
import {
  Users, ShoppingBag, MousePointerClick, Search, Heart, ShoppingCart,
  MessageSquare, Trash2, Ban, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import {
  setUserActive,
  deleteUserAccount,
  setFeedbackStatus,
  deleteFeedback,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/admin")({
  component: AdminPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-md p-12 text-center">
      <h1 className="text-xl font-bold">Admin error</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">Retry</Button>
    </div>
  ),
});

type EventRow = { event_type: string; created_at: string; query: string | null };
type OrderRow = { id: string; user_id: string; total: number; status: string; created_at: string };
type ProfileRow = { id: string; display_name: string | null; created_at: string; is_active: boolean };
type FeedbackRow = {
  id: string;
  user_id: string;
  category: string;
  subject: string;
  message: string;
  rating: number | null;
  status: "new" | "reviewed" | "resolved";
  admin_notes: string | null;
  created_at: string;
};

function AdminPage() {
  const { user, loading } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [userSearch, setUserSearch] = useState("");
  const [fbFilter, setFbFilter] = useState<"all" | "new" | "reviewed" | "resolved">("all");

  const setActiveFn = useServerFn(setUserActive);
  const deleteUserFn = useServerFn(deleteUserAccount);
  const setStatusFn = useServerFn(setFeedbackStatus);
  const deleteFbFn = useServerFn(deleteFeedback);

  const profiles = useQuery({
    queryKey: ["admin-profiles"],
    enabled: isAdmin,
    queryFn: async (): Promise<ProfileRow[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, created_at, is_active")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as ProfileRow[];
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

  const feedback = useQuery({
    queryKey: ["admin-feedback"],
    enabled: isAdmin,
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, user_id, category, subject, message, rating, status, admin_notes, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

  const toggleActive = useMutation({
    mutationFn: (vars: { userId: string; active: boolean }) =>
      setActiveFn({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(vars.active ? "User activated" : "User deactivated");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeUser = useMutation({
    mutationFn: (userId: string) => deleteUserFn({ data: { userId } }),
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateFb = useMutation({
    mutationFn: (vars: {
      id: string;
      status: "new" | "reviewed" | "resolved";
      admin_notes?: string;
    }) => setStatusFn({ data: vars }),
    onSuccess: () => {
      toast.success("Feedback updated");
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const removeFb = useMutation({
    mutationFn: (id: string) => deleteFbFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Feedback deleted");
      qc.invalidateQueries({ queryKey: ["admin-feedback"] });
    },
    onError: (e: Error) => toast.error(e.message),
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
  const filteredProfiles = (profiles.data ?? []).filter((p) =>
    userSearch
      ? (p.display_name ?? "").toLowerCase().includes(userSearch.toLowerCase()) ||
        p.id.toLowerCase().includes(userSearch.toLowerCase())
      : true,
  );
  const filteredFeedback = (feedback.data ?? []).filter((f) =>
    fbFilter === "all" ? true : f.status === fbFilter,
  );
  const fbCounts = {
    new: (feedback.data ?? []).filter((f) => f.status === "new").length,
    reviewed: (feedback.data ?? []).filter((f) => f.status === "reviewed").length,
    resolved: (feedback.data ?? []).filter((f) => f.status === "resolved").length,
  };

  const stats = [
    { label: "Users", value: profiles.data?.length ?? 0, icon: Users },
    { label: "Orders", value: orders.data?.length ?? 0, icon: ShoppingBag },
    { label: "Revenue", value: formatPrice(totalRevenue), icon: ShoppingBag },
    { label: "Clicks", value: evCount("click"), icon: MousePointerClick },
    { label: "Searches", value: evCount("search"), icon: Search },
    { label: "Wishlist", value: evCount("wishlist_add"), icon: Heart },
    { label: "Cart adds", value: evCount("cart_add"), icon: ShoppingCart },
    { label: "Feedback", value: feedback.data?.length ?? 0, icon: MessageSquare },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold text-gradient">TechNova Admin</h1>
        <p className="text-muted-foreground">User management, feedback & analytics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-8">
        {stats.map((s) => (
          <Card key={s.label} className="bg-gradient-card">
            <CardContent className="p-4">
              <s.icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-2xl font-bold">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="feedback">
            Feedback {fbCounts.new > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 text-xs text-primary-foreground">
                {fbCounts.new}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User management</CardTitle>
              <Input
                placeholder="Search by name or id"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="mt-2 max-w-md"
              />
            </CardHeader>
            <CardContent>
              {profiles.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Display name</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProfiles.map((p) => {
                      const self = p.id === user.id;
                      return (
                        <TableRow key={p.id}>
                          <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}…</TableCell>
                          <TableCell>{p.display_name ?? "—"}</TableCell>
                          <TableCell>{new Date(p.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <span
                              className={`rounded px-2 py-0.5 text-xs ${
                                p.is_active
                                  ? "bg-green-500/15 text-green-400"
                                  : "bg-red-500/15 text-red-400"
                              }`}
                            >
                              {p.is_active ? "Active" : "Deactivated"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={self || toggleActive.isPending}
                                onClick={() =>
                                  toggleActive.mutate({ userId: p.id, active: !p.is_active })
                                }
                              >
                                {p.is_active ? (
                                  <><Ban className="mr-1 h-3 w-3" />Deactivate</>
                                ) : (
                                  <><CheckCircle2 className="mr-1 h-3 w-3" />Activate</>
                                )}
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive" disabled={self}>
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete this user?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This permanently removes the user and all their data
                                      (orders, cart, wishlist, reviews, feedback). This cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => removeUser.mutate(p.id)}
                                      className="bg-destructive text-destructive-foreground"
                                    >
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>User feedback</CardTitle>
              <div className="mt-2 flex gap-2">
                {(["all", "new", "reviewed", "resolved"] as const).map((f) => (
                  <Button
                    key={f}
                    size="sm"
                    variant={fbFilter === f ? "default" : "outline"}
                    onClick={() => setFbFilter(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              {feedback.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : filteredFeedback.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No feedback in this filter.
                </p>
              ) : (
                <div className="space-y-3">
                  {filteredFeedback.map((f) => (
                    <FeedbackCard
                      key={f.id}
                      item={f}
                      onUpdate={(vars) => updateFb.mutate(vars)}
                      onDelete={() => removeFb.mutate(f.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card>
            <CardHeader><CardTitle>Recent orders</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(orders.data ?? []).slice(0, 30).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}…</TableCell>
                      <TableCell className="font-mono text-xs">{o.user_id.slice(0, 8)}…</TableCell>
                      <TableCell>
                        <span className="rounded bg-primary/20 px-2 py-0.5 text-xs">{o.status}</span>
                      </TableCell>
                      <TableCell className="text-right">{formatPrice(Number(o.total))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeedbackCard({
  item,
  onUpdate,
  onDelete,
}: {
  item: FeedbackRow;
  onUpdate: (vars: {
    id: string;
    status: "new" | "reviewed" | "resolved";
    admin_notes?: string;
  }) => void;
  onDelete: () => void;
}) {
  const [notes, setNotes] = useState(item.admin_notes ?? "");
  const [status, setStatus] = useState<FeedbackRow["status"]>(item.status);

  return (
    <div className="rounded-xl border border-border/40 bg-gradient-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded bg-primary/15 px-2 py-0.5 text-xs capitalize text-primary">
            {item.category.replace("_", " ")}
          </span>
          {item.rating && (
            <span className="text-xs">★ {item.rating}/5</span>
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {item.user_id.slice(0, 8)}…
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(item.created_at).toLocaleString()}
        </span>
      </div>
      <p className="mt-2 font-medium">{item.subject}</p>
      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{item.message}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[200px_1fr_auto]">
        <Select value={status} onValueChange={(v) => setStatus(v as FeedbackRow["status"])}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Internal notes / reply to user…"
          rows={2}
          maxLength={2000}
        />
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => onUpdate({ id: item.id, status, admin_notes: notes })}
          >
            Save
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this feedback?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
