import type { AboutModel } from "./about";

/**
 * /llms.txt (https://llmstxt.org): the same facts as /about, as Markdown for language models.
 * Prose before the first `##`, then sections of links.
 */
export function buildLlmsTxt(m: AboutModel, origin: URL): string {
  const abs = (path: string) => new URL(path, origin).href;
  const lines: string[] = [`# ${m.name}`, "", `> ${m.summary}`, ""];

  const bio = m.bio.filter((p) => p !== m.summary);
  if (bio.length) lines.push(...bio.flatMap((p) => [p, ""]));

  lines.push(
    `- Official site: ${origin.href}`,
    ...m.facts.map((f) => `- ${f.label}: ${f.value}`),
    ...m.contact.map((c) => `- ${c.label}: ${c.email}`),
    "",
  );

  lines.push("## Music", "");
  for (const d of m.discography) {
    const listen = d.spotify
      ? ` Listen on Spotify: ${d.spotify}`
      : d.presave
        ? ` Pre-save: ${d.presave}`
        : "";
    lines.push(
      `- [${d.title}](${d.url}): ${d.kind} by ${m.name}. ${d.status}. ${d.chapter}.${listen}`,
    );
    if (d.tracks.length > 1) {
      lines.push(
        `  Tracks: ${d.tracks.map((t, i) => `${i + 1}. ${t.title} (${t.duration})`).join("; ")}`,
      );
    }
  }
  lines.push("");

  lines.push("## Official profiles", "");
  lines.push(...m.links.map((l) => `- [${l.label}](${l.url})${l.note ? `: ${l.note}` : ""}`), "");

  lines.push(
    "## Site",
    "",
    `- [About](${abs("/about")}): bio, discography, official links and FAQ`,
    `- [Links](${abs("/links")}): every official platform in one place`,
  );
  if (m.merchUrl) {
    lines.push(`- [Merch](${m.merchUrl}): the official store (checkout by Fourthwall)`);
  }
  lines.push("", "## Optional", "", `- [Sitemap](${abs("/sitemap.xml")})`, "");

  return lines.join("\n");
}
