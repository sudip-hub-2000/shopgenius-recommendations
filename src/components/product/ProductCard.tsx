import { Link } from "@tanstack/react-router";
import { Heart, ShoppingCart, Star } from "lucide-react";
import type { Product } from "@/lib/types";
import { formatPrice, discountPercent } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useWishlist } from "@/hooks/use-wishlist";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { cn } from "@/lib/utils";
import { trackEvent } from "@/lib/track";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product }) {
  const cart = useCart();
  const wishlist = useWishlist();
  const isAdmin = useIsAdmin();
  const discount = discountPercent(product.price, product.discount_price);
  const finalPrice = product.discount_price ?? product.price;
  const isExternal = product.id.startsWith("ext-");
  const isWishlisted = !isExternal && wishlist.ids.has(product.id);

  return (
    <div className="group relative flex flex-col rounded-xl bg-gradient-card border border-border/40 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-glow hover:border-primary/50">
      {isExternal ? (
        <div className="relative block aspect-square overflow-hidden bg-white">
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-3 top-3 rounded-md bg-black/70 px-2 py-1 text-[10px] font-bold text-white">
            DISCOVER
          </span>
        </div>
      ) : (
        <Link
          to="/product/$id"
          params={{ id: product.id }}
          onClick={() => trackEvent("click", { productId: product.id })}
          className="relative block aspect-square overflow-hidden bg-muted/30"
        >
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          {discount > 0 && (
            <span className="absolute left-3 top-3 rounded-md bg-gradient-violet px-2 py-1 text-xs font-bold text-white shadow-glow">
              -{discount}%
            </span>
          )}
          <button
            onClick={(e) => {
              e.preventDefault();
              wishlist.toggle.mutate(product.id);
              if (!isWishlisted) trackEvent("wishlist_add", { productId: product.id });
            }}
            aria-label="Toggle wishlist"
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full glass transition-colors hover:bg-primary/20"
          >
            <Heart className={cn("h-4 w-4", isWishlisted ? "fill-primary text-primary" : "text-foreground")} />
          </button>
        </Link>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="line-clamp-2 text-sm font-medium">{product.name}</p>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
          <span>{product.rating.toFixed(1)}</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-gradient">{formatPrice(finalPrice)}</span>
          {product.discount_price && (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(product.price)}</span>
          )}
        </div>
        {isExternal ? (
          <Button size="sm" variant="outline" className="mt-auto" disabled>
            Preview only
          </Button>
        ) : (
          <Button
            size="sm"
            className="mt-auto bg-gradient-violet text-white shadow-glow hover:opacity-90"
            onClick={() => {
              cart.add.mutate(product.id);
              trackEvent("cart_add", { productId: product.id });
            }}
            disabled={cart.add.isPending}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to cart
          </Button>
        )}
      </div>
    </div>
  );
}
