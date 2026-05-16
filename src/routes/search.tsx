import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { searchProducts, fetchAllProducts } from "@/lib/queries";
import { ProductGrid } from "@/components/product/ProductGrid";
import { RecommendationRail } from "@/components/product/RecommendationRail";
import type { Product } from "@/lib/types";

export const Route = createFileRoute("/search")({
  validateSearch: z.object({ q: z.string().optional().default("") }),
  component: SearchPage,
});

function SearchPage() {
  const { q } = Route.useSearch();

  const results = useQuery({
    queryKey: ["search", q],
    queryFn: () => (q ? searchProducts(q, 40) : fetchAllProducts()),
  });

  // Recommendations: top tags from results, same categories
  const recs = useQuery({
    queryKey: ["search-recs", q, results.data?.length ?? 0],
    enabled: !!results.data && results.data.length > 0,
    queryFn: async (): Promise<Product[]> => {
      const items = results.data!;
      const catIds = new Set(items.map((i) => i.category_id).filter(Boolean));
      const allTags = new Set(items.flatMap((i) => i.tags));
      const all = await fetchAllProducts();
      const ids = new Set(items.map((i) => i.id));
      return all
        .filter((p) => !ids.has(p.id) && p.category_id && catIds.has(p.category_id))
        .map((p) => ({ p, score: p.tags.filter((t) => allTags.has(t)).length }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((s) => s.p);
    },
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-3xl font-bold">
        {q ? <>Results for <span className="text-gradient">"{q}"</span></> : "All products"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        {results.data?.length ?? 0} item{results.data?.length === 1 ? "" : "s"} found
      </p>
      <ProductGrid products={results.data ?? []} loading={results.isLoading} />
      <RecommendationRail products={recs.data ?? []} />
    </div>
  );
}
