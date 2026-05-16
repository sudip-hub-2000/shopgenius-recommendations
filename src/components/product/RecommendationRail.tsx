import type { Product } from "@/lib/types";
import { ProductCard } from "./ProductCard";
import { Sparkles } from "lucide-react";

export function RecommendationRail({
  products,
  title = "You might also like",
}: {
  products: Product[];
  title?: string;
}) {
  if (!products.length) return null;
  return (
    <section className="mt-16">
      <div className="mb-6 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-gradient">{title}</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>
    </section>
  );
}
