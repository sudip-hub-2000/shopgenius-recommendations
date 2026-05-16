import { Link } from "@tanstack/react-router";
import type { Category } from "@/lib/types";

export function CategoryStrip({ categories }: { categories: Category[] }) {
  return (
    <section>
      <h2 className="mb-6 text-2xl font-bold">Shop by category</h2>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {categories.map((c) => (
          <Link
            key={c.id}
            to="/category/$slug"
            params={{ slug: c.slug }}
            className="group flex flex-col items-center gap-2 rounded-xl bg-gradient-card border border-border/40 p-4 transition-all hover:-translate-y-1 hover:border-primary/60 hover:shadow-glow"
          >
            <div className="aspect-square w-full overflow-hidden rounded-lg">
              <img
                src={c.image_url ?? ""}
                alt={c.name}
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
            </div>
            <p className="text-center text-sm font-medium">{c.name}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
