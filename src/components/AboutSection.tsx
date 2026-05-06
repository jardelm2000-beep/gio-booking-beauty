import { Instagram, Award, Heart, BookOpen, type LucideIcon } from "lucide-react";
import aboutPhoto from "@/assets/about-photo.jpg";
import { useBrand } from "@/hooks/useBrand";
import { getTypo } from "@/lib/typography";

const BADGE_ICONS: Record<string, LucideIcon> = {
  award: Award,
  heart: Heart,
  book: BookOpen,
};

const AboutSection = () => {
  const { tenant } = useBrand();
  const photo = tenant.about_photo_url || aboutPhoto;
  const nameParts = tenant.name.split(" ");
  const head = nameParts.slice(0, -1).join(" ");
  const tail = nameParts.slice(-1)[0];
  const Badge1 = BADGE_ICONS[tenant.badge1_icon] ?? Award;
  const Badge2 = BADGE_ICONS[tenant.badge2_icon] ?? Heart;
  const tHeading = getTypo(tenant.typography, "about_heading");
  const tBio = getTypo(tenant.typography, "bio");
  const tAbout = getTypo(tenant.typography, "about_text");
  const tBadges = getTypo(tenant.typography, "badges");
  return (
    <section id="sobre" className="py-20 sm:py-28 bg-card/50">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="relative">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-border/50">
              <img
                src={photo}
                alt={tenant.name}
                className="w-full h-full object-cover"
                loading="lazy"
                width={800}
                height={1024}
              />
            </div>
          </div>

          <div className="space-y-6">
            <span className="text-xs font-sans uppercase tracking-[0.3em] text-primary">
              Sobre
            </span>
            <h2 className={`leading-snug ${tHeading.className}`} style={tHeading.style}>
              {head} <span className="text-gradient-gold italic">{tail}</span>
            </h2>
            {tenant.bio && (
              <p className={`text-foreground/80 italic leading-relaxed border-l-2 border-primary/40 pl-4 whitespace-pre-line ${tBio.className}`} style={tBio.style}>
                {tenant.bio}
              </p>
            )}
            <p className={`text-muted-foreground leading-relaxed whitespace-pre-line ${tAbout.className}`} style={tAbout.style}>
              {tenant.about_text}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 pt-2">
              <div className={`flex items-center gap-2 text-foreground/70 ${tBadges.className}`} style={tBadges.style}>
                <Badge1 className="w-4 h-4 text-primary flex-shrink-0" />
                {tenant.badge1_label}
              </div>
              <div className={`flex items-center gap-2 text-foreground/70 ${tBadges.className}`} style={tBadges.style}>
                <Badge2 className="w-4 h-4 text-primary flex-shrink-0" />
                {tenant.badge2_label}
              </div>
            </div>

            {tenant.instagram_handle && (
              <a
                href={`https://www.instagram.com/${tenant.instagram_handle}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-gold-light transition-colors font-sans text-sm"
              >
                <Instagram className="w-4 h-4" />
                @{tenant.instagram_handle}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
