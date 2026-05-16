import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/hooks/use-wishlist";
import { useAuth } from "@/hooks/use-auth";
import { ProductCard } from "@/components/product/ProductCard";

export const Route = createFileRoute("/wishlist")({
  component: WishlistPage,
});

function WishlistPage() {
  const { user } = useAuth();
  const wishlist = useWishlist();

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <Heart className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to view your wishlist</h1>
        <Link to="/login"><Button className="mt-4 bg-gradient-violet text-white">Sign in</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-3xl font-bold">Your wishlist</h1>
      {wishlist.items.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">No saved items yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {wishlist.items.map((i) => <ProductCard key={i.id} product={i.product} />)}
        </div>
      )}
    </div>
  );
}
