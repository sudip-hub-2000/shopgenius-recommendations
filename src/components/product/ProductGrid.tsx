import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Skeleton } from "@/components/ui/skeleton";

export function ProductGrid({ products, loading }: { products: Product[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
        ))}
      </div>
    );
  }
  if (!products.length) {
    return <p className="py-16 text-center text-muted-foreground">No products found.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
