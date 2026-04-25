import { useBrand } from "@/hooks/useBrand";

const GallerySection = () => {
  const { tenant } = useBrand();
  if (!tenant.gallery || tenant.gallery.length === 0) return null;
  return (
    <section id="galeria" className="py-20 sm:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
              Galeria
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl">
              Nossos <span className="text-gradient-gold italic">trabalhos</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {tenant.gallery.map((src, i) => (
              <div
                key={`${src}-${i}`}
                className="aspect-square rounded-xl overflow-hidden border border-border/50"
              >
                <img
                  src={src}
                  alt={`Trabalho ${i + 1} de ${tenant.name}`}
                  loading="lazy"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default GallerySection;