import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/cart")({
  component: CartPage,
});

function CartPage() {
  const cart = useCart();
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to view your cart</h1>
        <Link to="/login">
          <Button className="mt-4 bg-gradient-violet text-white shadow-glow">Sign in</Button>
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <Link to="/"><Button className="mt-4 bg-gradient-violet text-white">Continue shopping</Button></Link>
      </div>
    );
  }

  const shipping = cart.subtotal > 100 ? 0 : 9.99;
  const tax = cart.subtotal * 0.08;
  const total = cart.subtotal + shipping + tax;

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="mb-6 text-3xl font-bold">Your cart ({cart.count})</h1>
        <div className="space-y-3">
          {cart.items.map((it) => (
            <div key={it.id} className="flex gap-4 rounded-xl border border-border/40 bg-gradient-card p-4">
              <img src={it.product.image_url} alt="" className="h-24 w-24 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <Link to="/product/$id" params={{ id: it.product.id }} className="font-medium hover:text-primary">
                  {it.product.name}
                </Link>
                <p className="mt-1 text-lg text-gradient font-bold">
                  {formatPrice(it.product.discount_price ?? it.product.price)}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => cart.updateQty.mutate({ id: it.id, quantity: it.quantity - 1 })}>
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center">{it.quantity}</span>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => cart.updateQty.mutate({ id: it.id, quantity: it.quantity + 1 })}>
                    <Plus className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="ml-auto text-destructive" onClick={() => cart.remove.mutate(it.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border/40 bg-gradient-card p-6">
        <h2 className="text-xl font-bold">Order summary</h2>
        <div className="space-y-2 text-sm">
          <Row label="Subtotal" value={formatPrice(cart.subtotal)} />
          <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
          <Row label="Tax (est.)" value={formatPrice(tax)} />
        </div>
        <div className="border-t border-border/40 pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-gradient">{formatPrice(total)}</span>
        </div>
        <Button className="w-full bg-gradient-violet text-white shadow-glow hover:opacity-90">
          Checkout
        </Button>
        <p className="text-xs text-muted-foreground text-center">Demo — checkout not implemented.</p>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}
