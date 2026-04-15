import { useEffect } from "react";
import { getAuthSiteOrigin } from "@/lib/auth-constants";

interface TrainerPageSEOProps {
  fullName: string;
  city?: string;
  specialization?: string | null;
  bio?: string | null;
  avatarUrl?: string | null;
  username: string;
  clientCount?: number;
}

const TrainerPageSEO = ({
  fullName,
  city = "",
  specialization,
  bio,
  avatarUrl,
  username,
  clientCount = 0,
}: TrainerPageSEOProps) => {
  const pageTitle = `${fullName} — مدرب شخصي${city ? ` في ${city}` : ""} | CoachBase`;

  const specs = specialization?.split(",").map((s) => s.trim()).filter(Boolean) || [];
  const specsText = specs.length > 0 ? specs.slice(0, 2).join(" و") : "لياقة بدنية";

  const metaDescription = `${fullName}، مدرب شخصي معتمد${city ? ` في ${city}` : ""}. ${
    clientCount > 0 ? `ساعد ${clientCount} عميل على تحقيق أهدافهم. ` : ""
  }${specsText}. احجز جلستك الأولى الآن.`;

  const site = getAuthSiteOrigin();
  const canonicalUrl = `${site}/t/${username}`;
  const ogImage = avatarUrl || `${site}/placeholder.svg`;

  const keywords = [
    `مدرب شخصي${city ? ` ${city}` : ""}`,
    `كوتش لياقة${city ? ` ${city}` : ""}`,
    ...(specs.map((s) => `مدرب ${s} السعودية`)),
    `personal trainer${city ? ` ${city}` : ""} saudi`,
    "CoachBase",
    fullName,
  ].join(", ");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Person", "LocalBusiness"],
    name: fullName,
    description: metaDescription,
    image: ogImage,
    url: canonicalUrl,
    ...(city && { address: { "@type": "PostalAddress", addressLocality: city, addressCountry: "SA" } }),
    ...(specialization && { knowsAbout: specs }),
  };

  useEffect(() => {
    // Set document title
    document.title = pageTitle;

    // Helper to set/create meta tags
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("name", "description", metaDescription);
    setMeta("name", "keywords", keywords);

    // Open Graph
    setMeta("property", "og:title", pageTitle);
    setMeta("property", "og:description", metaDescription);
    setMeta("property", "og:image", ogImage);
    setMeta("property", "og:url", canonicalUrl);
    setMeta("property", "og:type", "profile");
    setMeta("property", "og:locale", "ar_SA");

    // Twitter Card
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", pageTitle);
    setMeta("name", "twitter:description", metaDescription);
    setMeta("name", "twitter:image", ogImage);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalUrl);

    // JSON-LD
    let script = document.querySelector('script[data-trainer-seo]') as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.setAttribute("type", "application/ld+json");
      script.setAttribute("data-trainer-seo", "true");
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(jsonLd);

    return () => {
      document.title = "CoachBase - منصة المدرب الشخصي";
      script?.remove();
      canonical?.remove();
    };
  }, [pageTitle, metaDescription, keywords, ogImage, canonicalUrl]);

  return null;
};

export default TrainerPageSEO;
