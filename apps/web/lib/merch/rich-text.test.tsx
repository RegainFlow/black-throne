import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RichText, toPlainText } from "./rich-text";

const html = (input: string) => renderToStaticMarkup(<RichText html={input} />);

describe("remote rich text", () => {
  it("drops scripts, styles, frames, images and event handlers", () => {
    const out = html(
      `<p onclick="alert(1)" style="color:red">Hi<script>alert(1)</script><style>p{}</style></p>` +
        `<iframe src="https://evil.example.com"></iframe><img src=x onerror="alert(1)">` +
        `<svg><script>alert(2)</script></svg>`,
    );
    expect(out).toBe("<div><p>Hi</p></div>");
  });

  it("only keeps http(s)/mailto links, and hardens them", () => {
    const out = html(
      `<p><a href="javascript:alert(1)">bad</a> <a href="https://example.com/x" target="_self">ok</a></p>`,
    );
    expect(out).not.toContain("javascript:");
    expect(out).toContain(
      '<a href="https://example.com/x" rel="noopener noreferrer nofollow" target="_blank">ok</a>',
    );
    expect(out).toContain("bad");
  });

  it("keeps lists, emphasis and headings, unwrapping unknown tags", () => {
    expect(html("<div><h2>Care</h2><ul><li><b>Cold</b> wash</li></ul><span>x</span></div>")).toBe(
      "<div><h3>Care</h3><ul><li><strong>Cold</strong> wash</li></ul>x</div>",
    );
  });

  it("wraps bare table rows in tbody and keeps it scrollable", () => {
    expect(html('<table><tr><td colspan="2">S</td><td onclick="x">M</td></tr></table>')).toBe(
      '<div><div class="overflow-x-auto"><table><tbody><tr><td colSpan="2">S</td><td>M</td></tr></tbody></table></div></div>',
    );
  });

  it("never nests links (invalid HTML that would break hydration)", () => {
    const out = html('<p><a href="https://a.example">x<a href="https://b.example">y</a></a></p>');
    expect(out).not.toMatch(/<a [^>]*>[^<]*<a /);
    expect(out).toContain(">x</a>");
  });

  it("unwraps block elements that would land inside a paragraph", () => {
    const out = html("<p><span><ul><li>x</li></ul></span></p>");
    expect(out).not.toMatch(/<p>[\s\S]*<ul>/);
  });

  it("decodes entities and renders plain text as paragraphs", () => {
    expect(html("<p>Tom &amp; Jerry &lt;3</p>")).toBe("<div><p>Tom &amp; Jerry &lt;3</p></div>");
    expect(html("one\ntwo\n\nthree")).toBe("<div><p>one<br/>two</p><p>three</p></div>");
    expect(html("   ")).toBe("");
  });

  it("extracts plain text for search and meta descriptions", () => {
    expect(
      toPlainText("<p>Heavy&nbsp;cotton.</p><ul><li>S</li><li>M</li></ul><script>x</script>"),
    ).toBe("Heavy cotton. S M");
  });
});
