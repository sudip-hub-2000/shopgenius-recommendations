import { Link } from "@tanstack/react-router";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";

export function CartSidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const cart = useCart();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/40 p-4">
          <SheetTitle>Your Cart ({cart.count})</SheetTitle>
        </SheetHeader>

        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground">
            <ShoppingBag className="h-12 w-12 opacity-50" />
            <p>Your cart is empty.</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.items.map((it) => (
                <div key={it.id} className="flex gap-3 rounded-lg border border-border/40 bg-card/60 p-3">
                  <img src={it.product.image_url} alt="" className="h-16 w-16 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{it.product.name}</p>
                    <p className="text-sm text-primary">
                      {formatPrice(it.product.discount_price ?? it.product.price)}
                    </p>
                    <div className="mt-2 flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => cart.updateQty.mutate({ id: it.id, quantity: it.quantity - 1 })}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => cart.updateQty.mutate({ id: it.id, quantity: it.quantity + 1 })}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="ml-auto h-7 w-7 text-destructive"
                        onClick={() => cart.remove.mutate(it.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-border/40 p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-bold">{formatPrice(cart.subtotal)}</span>
              </div>
              <Link to="/cart" onClick={() => onOpenChange(false)}>
                <Button className="w-full bg-gradient-violet text-white shadow-glow">View cart</Button>
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
