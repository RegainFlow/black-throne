import { ldScript } from "@/lib/jsonld";

/** One JSON-LD node as a server-rendered script tag (`<` escaped by `ldScript`). */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD from first-party content, `<` escaped
      dangerouslySetInnerHTML={{ __html: ldScript(data) }}
    />
  );
}
