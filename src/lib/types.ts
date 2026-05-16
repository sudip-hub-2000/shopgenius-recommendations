export type Category = {
  id: string;
  slug: string;
  name: string;
  image_url: string | null;
};

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  discount_price: number | null;
  image_url: string;
  category_id: string | null;
  tags: string[];
  rating: number;
  stock: number;
  trending: boolean;
};

export type CartItem = {
  id: string;
  product_id: string;
  quantity: number;
  product: Product;
};

export type WishlistItem = {
  id: string;
  product_id: string;
  product: Product;
};
