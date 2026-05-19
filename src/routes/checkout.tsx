import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  CreditCard,
  Wallet,
  Truck,
  ShieldCheck,
  CheckCircle,
  ArrowLeft,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { formatPrice } from "@/lib/format";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { trackEvent } from "@/lib/track";

export const Route = createFileRoute("/checkout")({
  component: CheckoutPage,
});

type PaymentMethod = "card" | "upi" | "cod";

function CheckoutPage() {
  const cart = useCart();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [step, setStep] = useState<"details" | "success">("details");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("card");
  const [isPaying, setIsPaying] = useState(false);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-primary" />
        <h1 className="mb-2 text-2xl font-bold">Sign in to checkout</h1>
        <Link to="/login">
          <Button className="mt-4 bg-gradient-violet text-white shadow-glow">
            Sign in
          </Button>
        </Link>
      </div>
    );
  }

  if (cart.items.length === 0 && step === "details") {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <ShoppingBag className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Your cart is empty</h1>
        <Link to="/">
          <Button className="mt-4 bg-gradient-violet text-white">
            Continue shopping
          </Button>
        </Link>
      </div>
    );
  }

  const shipping = cart.subtotal > 100 ? 0 : 9.99;
  const tax = cart.subtotal * 0.08;
  const total = cart.subtotal + shipping + tax;

  const handlePay = async () => {
    if (isPaying) return; // guard against double-submit
    if (cart.items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setIsPaying(true);
    try {
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          subtotal: cart.subtotal,
          shipping,
          tax,
          total,
          payment_method: paymentMethod,
          status: "placed",
        })
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      const items = cart.items.map((it) => ({
        order_id: order.id,
        product_id: it.product_id,
        product_name: it.product.name,
        product_image: it.product.image_url,
        unit_price: it.product.discount_price ?? it.product.price,
        quantity: it.quantity,
      }));
      const { error: itemsErr } = await supabase
        .from("order_items")
        .insert(items);
      if (itemsErr) throw itemsErr;

      // Clear cart
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      qc.invalidateQueries({ queryKey: ["cart"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["recommendations"] });

      // Track each purchased item to power future recommendations
      cart.items.forEach((it) =>
        trackEvent("purchase", { productId: it.product_id }),
      );

      setLastOrderId(order.id);
      // Simulate processing delay
      setTimeout(() => {
        setIsPaying(false);
        setStep("success");
      }, 1200);
    } catch (e) {
      setIsPaying(false);
      toast.error(e instanceof Error ? e.message : "Payment failed");
    }
  };

  if (step === "success") {
    return (
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-violet shadow-glow">
          <CheckCircle className="h-10 w-10 text-white" />
        </div>
        <h1 className="mb-2 text-3xl font-bold">Order placed!</h1>
        <p className="mb-8 text-muted-foreground">
          Thank you for shopping with us. This is a demo — no real payment was
          processed.
        </p>
        <div className="w-full rounded-2xl border border-border/40 bg-gradient-card p-6 text-left">
          <p className="text-sm text-muted-foreground">Order total</p>
          <p className="text-2xl font-bold text-gradient">
            {formatPrice(total)}
          </p>
          {lastOrderId && (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              Order #{lastOrderId.slice(0, 8).toUpperCase()}
            </p>
          )}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/orders">
            <Button className="bg-gradient-violet text-white shadow-glow">
              View my orders
            </Button>
          </Link>
          <Link to="/">
            <Button variant="outline">Continue shopping</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_380px]">
      <div>
        <Link
          to="/cart"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to cart
        </Link>

        <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

        <section className="mb-8 rounded-2xl border border-border/40 bg-gradient-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Shipping address</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                className="border-border/40 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                placeholder="+1 555 000 0000"
                className="border-border/40 bg-secondary/50"
              />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="123 Main Street"
                className="border-border/40 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                placeholder="New York"
                className="border-border/40 bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP / Postal code</Label>
              <Input
                id="zip"
                placeholder="10001"
                className="border-border/40 bg-secondary/50"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border/40 bg-gradient-card p-6">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Payment method</h2>
          </div>

          <div className="space-y-3">
            <PaymentOption
              id="card"
              label="Credit / Debit Card"
              icon={<CreditCard className="h-4 w-4" />}
              selected={paymentMethod === "card"}
              onSelect={() => setPaymentMethod("card")}
            />
            {paymentMethod === "card" && (
              <div className="grid gap-3 rounded-xl border border-border/40 bg-secondary/40 p-4 sm:grid-cols-2">
                <div className="sm:col-span-2 space-y-2">
                  <Label htmlFor="cardNum">Card number</Label>
                  <Input
                    id="cardNum"
                    placeholder="4242 4242 4242 4242"
                    className="border-border/40 bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry</Label>
                  <Input
                    id="expiry"
                    placeholder="MM / YY"
                    className="border-border/40 bg-secondary/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input
                    id="cvv"
                    placeholder="123"
                    className="border-border/40 bg-secondary/50"
                  />
                </div>
              </div>
            )}

            <PaymentOption
              id="upi"
              label="UPI / Wallet"
              icon={<Wallet className="h-4 w-4" />}
              selected={paymentMethod === "upi"}
              onSelect={() => setPaymentMethod("upi")}
            />
            {paymentMethod === "upi" && (
              <div className="rounded-xl border border-border/40 bg-secondary/40 p-4 space-y-2">
                <Label htmlFor="upiId">UPI ID</Label>
                <Input
                  id="upiId"
                  placeholder="yourname@upi"
                  className="border-border/40 bg-secondary/50"
                />
              </div>
            )}

            <PaymentOption
              id="cod"
              label="Cash on Delivery"
              icon={<Truck className="h-4 w-4" />}
              selected={paymentMethod === "cod"}
              onSelect={() => setPaymentMethod("cod")}
            />
          </div>
        </section>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-border/40 bg-gradient-card p-6">
        <h2 className="text-xl font-bold">Order summary</h2>
        <div className="space-y-3">
          {cart.items.map((it) => (
            <div key={it.id} className="flex items-center gap-3">
              <img
                src={it.product.image_url}
                alt=""
                className="h-12 w-12 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.product.name}</p>
                <p className="text-xs text-muted-foreground">
                  Qty: {it.quantity}
                </p>
              </div>
              <span className="text-sm font-medium">
                {formatPrice(
                  (it.product.discount_price ?? it.product.price) * it.quantity,
                )}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-border/40 pt-3 space-y-2 text-sm">
          <Row label="Subtotal" value={formatPrice(cart.subtotal)} />
          <Row label="Shipping" value={shipping === 0 ? "Free" : formatPrice(shipping)} />
          <Row label="Tax (est.)" value={formatPrice(tax)} />
        </div>
        <div className="border-t border-border/40 pt-3 flex justify-between text-lg font-bold">
          <span>Total</span>
          <span className="text-gradient">{formatPrice(total)}</span>
        </div>
        <Button
          className="w-full bg-gradient-violet text-white shadow-glow hover:opacity-90"
          onClick={handlePay}
          disabled={isPaying}
        >
          {isPaying ? "Processing..." : `Pay ${formatPrice(total)}`}
        </Button>
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <ShieldCheck className="h-3 w-3" />
          <span>Secure mock payment — no real charges</span>
        </div>
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

function PaymentOption({
  id,
  label,
  icon,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer ${
        selected
          ? "border-primary bg-primary/10"
          : "border-border/40 bg-secondary/30 hover:bg-secondary/50"
      }`}
    >
      <div
        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
          selected ? "border-primary bg-primary" : "border-muted-foreground"
        }`}
      >
        {selected && <div className="h-2 w-2 rounded-full bg-white" />}
      </div>
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}
