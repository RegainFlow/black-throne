import "server-only";
import { parseDocument } from "htmlparser2";
import { createElement, Fragment, type ReactNode } from "react";

/**
 * Remote (Fourthwall) HTML → React elements through an allowlist. Nothing is injected as raw
 * HTML: unknown tags are unwrapped to their text, dangerous ones dropped whole, and no remote
 * attribute survives except a checked http(s)/mailto href and numeric table spans.
 */

type Doc = ReturnType<typeof parseDocument>;
type Node = Doc["children"][number];

/** Dropped with everything inside them. */
const DROP = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "template",
  "svg",
  "math",
  "img",
  "picture",
  "video",
  "audio",
  "canvas",
  "form",
  "input",
  "button",
  "select",
  "textarea",
  "noscript",
  "head",
  "title",
  "meta",
  "link",
]);

const MAP: Record<string, string> = {
  p: "p",
  br: "br",
  strong: "strong",
  b: "strong",
  em: "em",
  i: "em",
  u: "u",
  ul: "ul",
  ol: "ol",
  li: "li",
  h1: "h3",
  h2: "h3",
  h3: "h3",
  h4: "h4",
  h5: "h4",
  h6: "h4",
  blockquote: "blockquote",
  table: "table",
  thead: "thead",
  tbody: "tbody",
  tfoot: "tfoot",
  tr: "tr",
  th: "th",
  td: "td",
  a: "a",
};

const BLOCK = new Set(["p", "ul", "ol", "li", "h3", "h4", "blockquote", "table"]);
/** Elements where whitespace text is invalid (React would warn and hydration would differ). */
const NO_TEXT = new Set(["ul", "ol", "table", "thead", "tbody", "tfoot", "tr"]);
const TABLE_SECTIONS = new Set(["thead", "tbody", "tfoot"]);

interface Ctx {
  inline: boolean;
  inLink: boolean;
  parent: string;
}

function safeHref(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw.trim());
    return ["http:", "https:", "mailto:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function span(raw: string | undefined): number | undefined {
  const n = Number(raw);
  return Number.isInteger(n) && n > 1 && n <= 20 ? n : undefined;
}

function renderNodes(nodes: Node[], ctx: Ctx, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  nodes.forEach((node, i) => {
    const k = `${key}.${i}`;
    if (node.type === "text") {
      const text = (node as { data: string }).data;
      if (NO_TEXT.has(ctx.parent) && !text.trim()) return;
      out.push(text);
      return;
    }
    if (node.type !== "tag") return; // comments, directives, <script>/<style> nodes, cdata
    const el = node as unknown as {
      name: string;
      attribs: Record<string, string>;
      children: Node[];
    };
    const name = el.name.toLowerCase();
    if (DROP.has(name)) return;
    const tag = MAP[name];

    // Unwrap anything not allowlisted, block elements inside inline context, nested links.
    if (!tag || (ctx.inline && BLOCK.has(tag)) || (tag === "a" && ctx.inLink)) {
      out.push(...renderNodes(el.children, ctx, k));
      return;
    }
    const props: Record<string, unknown> = { key: k };
    if (tag === "a") {
      const href = safeHref(el.attribs.href);
      if (!href) {
        out.push(...renderNodes(el.children, ctx, k));
        return;
      }
      props.href = href;
      props.rel = "noopener noreferrer nofollow";
      props.target = "_blank";
    }
    if (tag === "th" || tag === "td") {
      props.colSpan = span(el.attribs.colspan);
      props.rowSpan = span(el.attribs.rowspan);
    }

    const childCtx: Ctx = {
      inline: tag === "p" || tag === "h3" || tag === "h4" || (ctx.inline && !BLOCK.has(tag)),
      inLink: ctx.inLink || tag === "a",
      parent: tag,
    };

    if (tag === "table") {
      out.push(
        <div key={k} className="overflow-x-auto">
          <table>{renderTableChildren(el.children, childCtx, k)}</table>
        </div>,
      );
      return;
    }
    if (tag === "br") {
      out.push(createElement("br", { key: k }));
      return;
    }
    out.push(createElement(tag, props, ...renderNodes(el.children, childCtx, k)));
  });
  return out;
}

/** Groups bare <tr> children of a <table> into a <tbody> so SSR markup matches the DOM. */
function renderTableChildren(nodes: Node[], ctx: Ctx, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let rows: Node[] = [];
  const flush = (i: number) => {
    if (rows.length) {
      out.push(
        <tbody key={`${key}.tb${i}`}>
          {renderNodes(rows, { ...ctx, parent: "tbody" }, `${key}.tb${i}`)}
        </tbody>,
      );
      rows = [];
    }
  };
  nodes.forEach((node, i) => {
    const name =
      node.type === "tag" ? (node as unknown as { name: string }).name.toLowerCase() : "";
    if (name === "tr") {
      rows.push(node);
      return;
    }
    flush(i);
    if (TABLE_SECTIONS.has(name)) out.push(...renderNodes([node], ctx, `${key}.${i}`));
  });
  flush(nodes.length);
  return out;
}

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*?>/i.test(s);

/** Remote rich text, sanitised. Plain-text input becomes paragraphs. */
export function RichText({ html, className }: { html: string; className?: string }) {
  if (!html.trim()) return null;
  if (!looksLikeHtml(html)) {
    return (
      <div className={className}>
        {html
          .split(/\n{2,}/)
          .map((para) => para.trim())
          .filter(Boolean)
          .map((para, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static paragraphs, never reordered
            <p key={i}>
              {para.split("\n").map((line, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static lines, never reordered
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {line}
                </Fragment>
              ))}
            </p>
          ))}
      </div>
    );
  }
  const doc = parseDocument(html);
  return (
    <div className={className}>
      {renderNodes(doc.children, { inline: false, inLink: false, parent: "div" }, "rt")}
    </div>
  );
}

/** Text content of remote HTML (search index, meta descriptions). */
export function toPlainText(html: string): string {
  if (!html) return "";
  if (!looksLikeHtml(html)) return html.replace(/\s+/g, " ").trim();
  const parts: string[] = [];
  const walk = (nodes: Node[]) => {
    for (const node of nodes) {
      if (node.type === "text") parts.push((node as { data: string }).data);
      else if (node.type === "tag") {
        const el = node as unknown as { name: string; children: Node[] };
        if (DROP.has(el.name.toLowerCase())) continue;
        parts.push(" ");
        walk(el.children);
        parts.push(" ");
      }
    }
  };
  walk(parseDocument(html).children);
  return parts.join("").replace(/\s+/g, " ").trim();
}
