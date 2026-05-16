export const formatPrice = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

export const discountPercent = (price: number, discount: number | null) => {
  if (!discount || discount >= price) return 0;
  return Math.round(((price - discount) / price) * 100);
};
