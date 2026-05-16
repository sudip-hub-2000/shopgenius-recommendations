import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchProductsByCategorySlug, fetchCategories } from "@/lib/queries";
import { ProductGrid } from "@/components/product/ProductGrid";

export const Route = createFileRoute("/category/$slug")({
  component: CategoryPage,
});

function CategoryPage() {
  const { slug } = Route.useParams();
  const products = useQuery({
    queryKey: ["category", slug],
    queryFn: () => fetchProductsByCategorySlug(slug),
  });
  const cats = useQuery({ queryKey: ["categories"], queryFn: fetchCategories });
  const cat = cats.data?.find((c) => c.slug === slug);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">{cat?.name ?? slug}</h1>
      <ProductGrid products={products.data ?? []} loading={products.isLoading} />
    </div>
  );
}
