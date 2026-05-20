import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { MessageSquare, Star, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback")({
  component: FeedbackPage,
  errorComponent: ({ error, reset }) => (
    <div className="mx-auto max-w-md p-12 text-center">
      <h1 className="text-xl font-bold">Something went wrong</h1>
      <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
      <Button onClick={reset} className="mt-4">
        Try again
      </Button>
    </div>
  ),
});

const CATEGORIES = [
  { value: "general", label: "General" },
  { value: "bug", label: "Bug report" },
  { value: "feature_request", label: "Feature request" },
  { value: "complaint", label: "Complaint" },
  { value: "praise", label: "Praise" },
  { value: "other", label: "Other" },
] as const;

const schema = z.object({
  category: z.enum([
    "general",
    "bug",
    "feature_request",
    "complaint",
    "praise",
    "other",
  ]),
  subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});

type FeedbackRow = {
  id: string;
  category: string;
  subject: string;
  message: string;
  rating: number | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
};

function FeedbackPage() {
  const { user, loading: authLoading } = useAuth();
  const isAdmin = useIsAdmin();
  const qc = useQueryClient();
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]["value"]>("general");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [rating, setRating] = useState<number>(0);

  const list = useQuery({
    queryKey: ["my-feedback", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<FeedbackRow[]> => {
      const { data, error } = await supabase
        .from("feedback")
        .select("id, category, subject, message, rating, status, admin_notes, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as FeedbackRow[];
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in");
      const parsed = schema.parse({
        category,
        subject,
        message,
        rating: rating > 0 ? rating : undefined,
      });
      const { error } = await supabase.from("feedback").insert({
        user_id: user.id,
        category: parsed.category,
        subject: parsed.subject,
        message: parsed.message,
        rating: parsed.rating ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thanks! Your feedback was sent.");
      setSubject("");
      setMessage("");
      setRating(0);
      setCategory("general");
      qc.invalidateQueries({ queryKey: ["my-feedback", user?.id] });
    },
    onError: (e: unknown) => {
      const msg =
        e instanceof z.ZodError
          ? e.issues[0]?.message ?? "Invalid input"
          : e instanceof Error
            ? e.message
            : "Failed to send feedback";
      toast.error(msg);
    },
  });

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="mt-6 h-80 w-full rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <MessageSquare className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to leave feedback</h1>
        <Link to="/login">
          <Button className="mt-4 bg-gradient-violet text-white shadow-glow">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <h1 className="text-2xl font-bold">Admins manage feedback</h1>
        <p className="mt-2 text-muted-foreground">
          Open the admin dashboard to review user feedback.
        </p>
        <Link to="/admin">
          <Button className="mt-4 bg-gradient-violet text-white shadow-glow">
            Open admin
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Share your feedback</h1>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit.mutate();
        }}
        className="space-y-4 rounded-2xl border border-border/40 bg-gradient-card p-6"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Category</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as typeof category)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Rating (optional)</Label>
            <div className="flex items-center gap-1 pt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setRating(rating === n ? 0 : n)}
                  className="rounded p-1 transition-colors hover:bg-primary/10"
                  aria-label={`${n} star`}
                >
                  <Star
                    className={
                      n <= rating
                        ? "h-5 w-5 fill-yellow-400 text-yellow-400"
                        : "h-5 w-5 text-muted-foreground"
                    }
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="What's this about?"
            maxLength={200}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tell us in detail…"
            rows={6}
            maxLength={2000}
            required
          />
          <p className="text-right text-xs text-muted-foreground">
            {message.length}/2000
          </p>
        </div>

        <Button
          type="submit"
          disabled={submit.isPending}
          className="bg-gradient-violet text-white shadow-glow"
        >
          <Send className="mr-2 h-4 w-4" />
          {submit.isPending ? "Sending…" : "Send feedback"}
        </Button>
      </form>

      <h2 className="mt-10 mb-3 text-lg font-semibold">Your previous feedback</h2>
      {list.isLoading ? (
        <Skeleton className="h-40 w-full rounded-2xl" />
      ) : !list.data || list.data.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          You haven't sent any feedback yet.
        </p>
      ) : (
        <div className="space-y-3">
          {list.data.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-border/40 bg-gradient-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-primary/15 px-2 py-0.5 text-xs capitalize text-primary">
                    {f.category.replace("_", " ")}
                  </span>
                  <StatusBadge status={f.status} />
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(f.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="mt-2 font-medium">{f.subject}</p>
              <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                {f.message}
              </p>
              {f.admin_notes && (
                <div className="mt-3 rounded-md bg-secondary/40 p-3 text-sm">
                  <p className="text-xs font-semibold text-primary">Reply from team</p>
                  <p className="mt-1 whitespace-pre-wrap">{f.admin_notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    new: "bg-blue-500/15 text-blue-400",
    reviewed: "bg-amber-500/15 text-amber-400",
    resolved: "bg-green-500/15 text-green-400",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-xs capitalize ${
        map[status] ?? "bg-muted/40"
      }`}
    >
      {status}
    </span>
  );
}
