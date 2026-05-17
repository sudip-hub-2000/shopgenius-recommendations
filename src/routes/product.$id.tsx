import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Heart, ShoppingCart, Star, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProductById, fetchRecommendations } from "@/lib/queries";
import { formatPrice, discountPercent } from "@/lib/format";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { RecommendationRail } from "@/components/product/RecommendationRail";
import { useRecommendations } from "@/hooks/use-recommendations";
import { trackEvent } from "@/lib/track";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

function ProductPage() {
  const { id } = Route.useParams();
  const product = useQuery({ queryKey: ["product", id], queryFn: () => fetchProductById(id) });
  const cart = useCart();
  const wishlist = useWishlist();

  const recs = useQuery({
    queryKey: ["recs", id],
    enabled: !!product.data,
    queryFn: () => fetchRecommendations(product.data!),
  });
  const personalized = useRecommendations(8);

  useEffect(() => {
    if (product.data) trackEvent("view", { productId: product.data.id });
  }, [product.data]);

  if (product.isLoading) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <Skeleton className="aspect-square rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }
  if (!product.data) return <div className="p-8 text-center">Product not found.</div>;

  const p = product.data;
  const finalPrice = p.discount_price ?? p.price;
  const discount = discountPercent(p.price, p.discount_price);
  const isWishlisted = wishlist.ids.has(p.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-card">
          <img src={p.image_url} alt={p.name} className="aspect-square w-full object-cover" />
          {discount > 0 && (
            <span className="absolute left-4 top-4 rounded-md bg-gradient-violet px-3 py-1 text-sm font-bold text-white shadow-glow">
              -{discount}%
            </span>
          )}
        </div>

        <div className="flex flex-col gap-5">
          <h1 className="text-3xl font-bold sm:text-4xl">{p.name}</h1>
          <div className="flex items-center gap-2 text-sm">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">{p.rating.toFixed(1)}</span>
            <span className="text-muted-foreground">· {p.stock} in stock</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl font-bold text-gradient">{formatPrice(finalPrice)}</span>
            {p.discount_price && (
              <span className="text-lg text-muted-foreground line-through">{formatPrice(p.price)}</span>
            )}
          </div>
          <p className="text-muted-foreground">{p.description}</p>

          <div className="flex flex-wrap gap-2">
            {p.tags.map((t) => (
              <span key={t} className="rounded-full bg-secondary/80 px-3 py-1 text-xs">
                #{t}
              </span>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="flex-1 bg-gradient-violet text-white shadow-glow hover:opacity-90"
              onClick={() => {
                cart.add.mutate(p.id);
                trackEvent("cart_add", { productId: p.id });
              }}
              disabled={cart.add.isPending}
            >
              <ShoppingCart className="mr-2 h-5 w-5" /> Add to cart
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                wishlist.toggle.mutate(p.id);
                if (!isWishlisted) trackEvent("wishlist_add", { productId: p.id });
              }}
              className={cn(isWishlisted && "border-primary text-primary")}
            >
              <Heart className={cn("mr-2 h-5 w-5", isWishlisted && "fill-primary")} />
              {isWishlisted ? "Saved" : "Save"}
            </Button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 rounded-xl border border-border/40 bg-card/60 p-4 text-center text-xs text-muted-foreground">
            <div className="flex flex-col items-center gap-1"><Truck className="h-5 w-5 text-primary" /> Free shipping</div>
            <div className="flex flex-col items-center gap-1"><RotateCcw className="h-5 w-5 text-primary" /> 30-day returns</div>
            <div className="flex flex-col items-center gap-1"><ShieldCheck className="h-5 w-5 text-primary" /> Secure checkout</div>
          </div>
        </div>
      </div>

      <RecommendationRail products={recs.data ?? []} title="Similar products" />
      <RecommendationRail products={personalized.data ?? []} title="Recommended for you" />
    </div>
  );
}
