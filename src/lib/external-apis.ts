import type { Product } from "./types";

/**
 * Adapters for free third-party product APIs.
 * All requests are best-effort: failures resolve to [] so the UI never breaks.
 */

const safeFetch = async <T>(url: string, init?: RequestInit): Promise<T | null> => {
  try {
    const res = await fetch(url, init);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
};

// Build a deterministic uuid-like id from a source + numeric id so React keys + cart lookups stay stable.
const synthId = (src: string, id: string | number) =>
  `ext-${src}-${String(id).replace(/[^a-z0-9]/gi, "").slice(0, 30)}`;

/** Fake Store API — https://fakestoreapi.com */
export async function fetchFakeStoreProducts(limit = 12): Promise<Product[]> {
  type FakeStoreItem = {
    id: number;
    title: string;
    price: number;
    description: string;
    category: string;
    image: string;
    rating?: { rate: number; count: number };
  };
  const data = await safeFetch<FakeStoreItem[]>(`https://fakestoreapi.com/products?limit=${limit}`);
  if (!data) return [];
  return data.map((p) => ({
    id: synthId("fs", p.id),
    name: p.title,
    description: p.description,
    price: Math.round(p.price * 85), // approx USD→INR feel
    discount_price: null,
    image_url: p.image,
    category_id: null,
    tags: [p.category],
    rating: p.rating?.rate ?? 4.2,
    stock: 50,
    trending: false,
  }));
}

/** DummyJSON — https://dummyjson.com/docs/products (a popular open product API used by many GitHub e-commerce demos) */
export async function fetchDummyJsonProducts(limit = 20): Promise<Product[]> {
  type DummyJsonResponse = {
    products: Array<{
      id: number;
      title: string;
      description: string;
      price: number;
      discountPercentage: number;
      rating: number;
      stock: number;
      category: string;
      thumbnail: string;
      tags?: string[];
    }>;
  };
  const data = await safeFetch<DummyJsonResponse>(`https://dummyjson.com/products?limit=${limit}`);
  if (!data?.products) return [];
  return data.products.map((p) => {
    const price = Math.round(p.price * 85);
    const discount = p.discountPercentage
      ? Math.round(price * (1 - p.discountPercentage / 100))
      : null;
    return {
      id: synthId("dj", p.id),
      name: p.title,
      description: p.description,
      price,
      discount_price: discount,
      image_url: p.thumbnail,
      category_id: null,
      tags: p.tags?.length ? p.tags : [p.category],
      rating: p.rating,
      stock: p.stock,
      trending: p.rating > 4.5,
    };
  });
}

/** Open Food Facts — https://world.openfoodfacts.org/data */
export async function fetchOpenFoodProducts(limit = 12): Promise<Product[]> {
  type OFFResponse = {
    products: Array<{
      code: string;
      product_name?: string;
      brands?: string;
      image_front_url?: string;
      image_url?: string;
      categories?: string;
      nutriscore_grade?: string;
    }>;
  };
  const url = `https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,brands,image_front_url,image_url,categories,nutriscore_grade&sort_by=popularity_key`;
  const data = await safeFetch<OFFResponse>(url);
  if (!data?.products) return [];
  return data.products
    .filter((p) => p.product_name && (p.image_front_url || p.image_url))
    .map((p) => ({
      id: synthId("off", p.code),
      name: p.product_name!,
      description: p.brands ? `By ${p.brands}` : "Grocery pick",
      price: 199 + Math.floor(Math.random() * 600),
      discount_price: null,
      image_url: (p.image_front_url || p.image_url)!,
      category_id: null,
      tags: (p.categories?.split(",").map((c) => c.trim()).slice(0, 3)) ?? ["food"],
      rating: p.nutriscore_grade ? Math.max(3, 5 - "abcde".indexOf(p.nutriscore_grade.toLowerCase())) : 4.0,
      stock: 100,
      trending: false,
    }))
    .slice(0, limit);
}

/** Aggregated discover feed (used on the home page) */
export async function fetchExternalDiscoverFeed(): Promise<Product[]> {
  const [a, b, c] = await Promise.all([
    fetchDummyJsonProducts(12),
    fetchFakeStoreProducts(8),
    fetchOpenFoodProducts(6),
  ]);
  return [...a, ...b, ...c];
}
