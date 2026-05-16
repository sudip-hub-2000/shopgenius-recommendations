# E-Commerce Recommendation System — Build Plan

A production-style storefront with auth, cart, wishlist, search with autocomplete, and "you might also like" recommendations. Violet→black gradient theme, fully responsive.

## 1. Backend (Lovable Cloud / Postgres)

Enable Lovable Cloud, then create these tables with RLS:

- `profiles` — id (FK auth.users), display_name, avatar_url. Auto-created via trigger on signup.
- `user_roles` — separate table with `app_role` enum + `has_role()` SECURITY DEFINER function (prevents privilege escalation).
- `categories` — id, slug, name, image_url.
- `products` — id, name, description, price, discount_price, image_url, category_id, tags[], rating, stock. Trigram GIN index on `name` for fast ILIKE search.
- `cart_items` — user_id, product_id, quantity (unique per user+product).
- `wishlist_items` — user_id, product_id (unique).
- `search_history` — user_id, query, created_at (for future personalization).

**RLS:** users access only their own cart/wishlist/history/profile. Products + categories are public read.

**Seed:** 6 categories (Electronics, Fashion, Home, Books, Beauty, Sports) × 4 products = 24 products with real image URLs.

**Auth:** email/password with auto-confirm signup enabled.

## 2. Frontend (TanStack Router + Tailwind + shadcn)

### Design system (`src/styles.css`)
- Theme tokens: violet (`oklch(0.55 0.25 295)`) → deep black background.
- Gradient tokens: `--gradient-primary` (violet→black), `--gradient-glow`, `--shadow-elegant`.
- Glass surfaces (backdrop-blur), custom button variants (`hero`, `glass`).
- Dark theme by default.

### Routes
- `/` — Hero, CategoryStrip, Trending products grid.
- `/search?q=...` — results + "You might also like" (same category + tag overlap).
- `/product/$id` — detail page + similar products.
- `/category/$slug` — category browse.
- `/cart` — full cart with quantity controls + order summary.
- `/wishlist` — saved items.
- `/login`, `/signup` — auth pages.
- `/_authenticated/*` layout for protected routes (cart, wishlist).

### Components
- `Navbar` — sticky glass, debounced autocomplete (hits Postgres ILIKE via server fn), cart + wishlist badges, user menu.
- `ProductCard` — hover lift, discount badge, wishlist heart toggle, "Add to cart" button.
- `CartSidebar` — slide-in sheet triggered from navbar.
- `Hero`, `CategoryStrip`, `TrendingGrid`, `RecommendationRail`.
- Loading skeletons + Sonner toasts for all actions.

### State
- TanStack Query for products/cart/wishlist (cache + invalidation).
- Auth context wired through router with `onAuthStateChange` listener.

## 3. Recommendation logic

Server fn `getRecommendations(productId)`:
1. Fetch source product's category + tags.
2. Query products in same category, score by tag overlap, exclude self.
3. Return top 8.

## 4. Folder structure

```
src/
  components/
    layout/      (Navbar, Footer, CartSidebar)
    product/     (ProductCard, ProductGrid, RecommendationRail)
    home/        (Hero, CategoryStrip, TrendingGrid)
    ui/          (shadcn)
  lib/
    products.functions.ts
    cart.functions.ts
    wishlist.functions.ts
    search.functions.ts
  hooks/         (useAuth, useCart, useWishlist)
  routes/        (file-based)
```

## 5. Technical notes
- Uses Lovable Cloud (Supabase under the hood) — no external API keys needed.
- All product images use Unsplash URLs (no upload step required).
- Server functions protected with `requireSupabaseAuth` for cart/wishlist.
- Public product queries use the browser supabase client (RLS allows public read).

This is a large first version — I'll build it focused and clean, and you can iterate from there.
