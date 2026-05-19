import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, ShieldCheck, Trash2, Pencil, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Review = {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  title: string | null;
  body: string | null;
  verified_purchase: boolean;
  created_at: string;
};

type Stats = {
  avg_rating: number;
  total: number;
  count_1: number;
  count_2: number;
  count_3: number;
  count_4: number;
  count_5: number;
};

export function ProductReviews({ productId }: { productId: string }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const isExternal = productId.startsWith("ext-");

  const reviewsQ = useQuery({
    queryKey: ["reviews", productId],
    enabled: !isExternal,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("product_reviews" as never)
        .select("*")
        .eq("product_id", productId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as Review[]) ?? [];
    },
  });

  const statsQ = useQuery({
    queryKey: ["review-stats", productId],
    enabled: !isExternal,
    queryFn: async (): Promise<Stats> => {
      const { data, error } = await supabase.rpc(
        "get_product_review_stats" as never,
        { _product_id: productId } as never,
      );
      if (error) throw error;
      const row = (Array.isArray(data) ? data[0] : data) as Stats | undefined;
      return row ?? { avg_rating: 0, total: 0, count_1: 0, count_2: 0, count_3: 0, count_4: 0, count_5: 0 };
    },
  });

  const own = reviewsQ.data?.find((r) => r.user_id === user?.id) ?? null;

  if (isExternal) {
    return (
      <section className="mt-16 rounded-2xl border border-border/40 bg-gradient-card p-6">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reviews are available for items from our main catalog. This is a preview item from an external API.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gradient">Customer reviews</h2>
          <p className="text-sm text-muted-foreground">What real customers say about this product.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <StatsPanel stats={statsQ.data} loading={statsQ.isLoading} />

        <div className="space-y-6">
          {user ? (
            <ReviewForm
              productId={productId}
              existing={own}
              onSaved={() => {
                qc.invalidateQueries({ queryKey: ["reviews", productId] });
                qc.invalidateQueries({ queryKey: ["review-stats", productId] });
              }}
            />
          ) : (
            <div className="rounded-2xl border border-border/40 bg-gradient-card p-5 text-sm">
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Sign in
              </Link>{" "}
              to write a review.
            </div>
          )}

          {reviewsQ.isLoading ? (
            <Skeleton className="h-32 w-full rounded-2xl" />
          ) : !reviewsQ.data?.length ? (
            <p className="rounded-2xl border border-border/40 bg-gradient-card p-6 text-center text-sm text-muted-foreground">
              No reviews yet. Be the first to share your experience!
            </p>
          ) : (
            <ul className="space-y-4">
              {reviewsQ.data.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  isOwn={r.user_id === user?.id}
                  onDeleted={() => {
                    qc.invalidateQueries({ queryKey: ["reviews", productId] });
                    qc.invalidateQueries({ queryKey: ["review-stats", productId] });
                  }}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function StatsPanel({ stats, loading }: { stats: Stats | undefined; loading: boolean }) {
  if (loading || !stats) return <Skeleton className="h-56 rounded-2xl" />;
  const total = stats.total || 1;
  const rows = [5, 4, 3, 2, 1] as const;
  const countMap: Record<number, number> = {
    5: stats.count_5, 4: stats.count_4, 3: stats.count_3, 2: stats.count_2, 1: stats.count_1,
  };
  return (
    <div className="h-fit rounded-2xl border border-border/40 bg-gradient-card p-5">
      <div className="text-center">
        <p className="text-5xl font-bold text-gradient">{Number(stats.avg_rating).toFixed(1)}</p>
        <StarRow value={Math.round(Number(stats.avg_rating))} />
        <p className="mt-1 text-xs text-muted-foreground">
          {stats.total} {stats.total === 1 ? "review" : "reviews"}
        </p>
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((s) => {
          const pct = stats.total ? (countMap[s] / total) * 100 : 0;
          return (
            <div key={s} className="flex items-center gap-2 text-xs">
              <span className="w-6 text-muted-foreground">{s}★</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary/60">
                <div className="h-full rounded-full bg-gradient-violet" style={{ width: `${pct}%` }} />
              </div>
              <span className="w-8 text-right text-muted-foreground">{countMap[s]}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StarRow({ value, onChange, size = "h-5 w-5" }: { value: number; onChange?: (v: number) => void; size?: string }) {
  return (
    <div className="mt-1 flex justify-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={onChange ? () => onChange(i) : undefined}
          className={cn(!onChange && "pointer-events-none")}
          aria-label={`${i} stars`}
        >
          <Star className={cn(size, i <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/40")} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  productId,
  existing,
  onSaved,
}: {
  productId: string;
  existing: Review | null;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [editing, setEditing] = useState(!existing);

  const save = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Sign in required");
      if (rating < 1 || rating > 5) throw new Error("Pick a rating");
      const payload = {
        product_id: productId,
        user_id: user.id,
        rating,
        title: title.trim() || null,
        body: body.trim() || null,
      };
      const { error } = await supabase
        .from("product_reviews" as never)
        .upsert(payload as never, { onConflict: "product_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(existing ? "Review updated" : "Review posted");
      setEditing(false);
      onSaved();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (existing && !editing) {
    return (
      <div className="rounded-2xl border border-primary/30 bg-gradient-card p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Your review</p>
          <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
            <Pencil className="mr-1 h-3 w-3" /> Edit
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-4 rounded-2xl border border-border/40 bg-gradient-card p-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <div>
        <p className="mb-2 text-sm font-medium">{existing ? "Update your review" : "Write a review"}</p>
        <StarRow value={rating} onChange={setRating} size="h-7 w-7" />
      </div>
      <Input
        placeholder="Title (optional)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={120}
        className="border-border/40 bg-secondary/40"
      />
      <Textarea
        placeholder="Share details about your experience"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={4}
        className="border-border/40 bg-secondary/40"
      />
      <div className="flex justify-end gap-2">
        {existing && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={save.isPending} className="bg-gradient-violet text-white shadow-glow">
          {save.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existing ? "Save changes" : "Submit review"}
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({ review, isOwn, onDeleted }: { review: Review; isOwn: boolean; onDeleted: () => void }) {
  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_reviews" as never).delete().eq("id", review.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review deleted");
      onDeleted();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <li className="rounded-2xl border border-border/40 bg-gradient-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30",
                  )}
                />
              ))}
            </div>
            {review.verified_purchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                <ShieldCheck className="h-3 w-3" /> Verified purchase
              </span>
            )}
            {isOwn && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-medium text-primary">You</span>
            )}
          </div>
          {review.title && <h3 className="mt-2 font-semibold">{review.title}</h3>}
          {review.body && <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{review.body}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {new Date(review.created_at).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        {isOwn && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => del.mutate()}
            disabled={del.isPending}
            aria-label="Delete review"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
