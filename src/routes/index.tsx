import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Hero } from "@/components/home/Hero";
import { CategoryStrip } from "@/components/home/CategoryStrip";
import { ProductGrid } from "@/components/product/ProductGrid";
import { fetchCategories, fetchTrendingProducts } from "@/lib/queries";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const trending = useQuery({ queryKey: ["trending"], queryFn: fetchTrendingProducts });

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-8 sm:px-6 sm:py-10">
      <Hero />
      <CategoryStrip categories={cats.data ?? []} />
      <section>
        <h2 className="mb-6 text-2xl font-bold">Trending now</h2>
        <ProductGrid products={trending.data ?? []} loading={trending.isLoading} />
      </section>
    </div>
  );
}
