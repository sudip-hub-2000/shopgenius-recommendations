import { supabase } from "@/integrations/supabase/client";
import type { Category, Product } from "./types";

export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase.from("categories").select("*").order("name");
  if (error) throw error;
  return data as Category[];
}

export async function fetchTrendingProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("trending", true)
    .limit(12);
  if (error) throw error;
  return data as Product[];
}

export async function fetchAllProducts(): Promise<Product[]> {
  const { data, error } = await supabase.from("products").select("*").limit(100);
  if (error) throw error;
  return data as Product[];
}

export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase.from("products").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function fetchProductsByCategorySlug(slug: string): Promise<Product[]> {
  const { data: cat, error: e1 } = await supabase
    .from("categories")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (e1) throw e1;
  if (!cat) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", cat.id);
  if (error) throw error;
  return data as Product[];
}

export async function searchProducts(query: string, limit = 20): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .ilike("name", `%${q}%`)
    .limit(limit);
  if (error) throw error;
  return data as Product[];
}

/** Recommend products: same category, score by tag overlap, exclude self */
export async function fetchRecommendations(product: Product, limit = 8): Promise<Product[]> {
  if (!product.category_id) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("category_id", product.category_id)
    .neq("id", product.id)
    .limit(20);
  if (error) throw error;
  const scored = (data as Product[])
    .map((p) => ({
      p,
      score: p.tags.filter((t) => product.tags.includes(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.p);
  return scored;
}

export async function logSearch(userId: string, query: string) {
  if (!query.trim()) return;
  await supabase.from("search_history").insert({ user_id: userId, query: query.trim() });
}
