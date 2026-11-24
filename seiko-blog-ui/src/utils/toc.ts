import { toString } from "mdast-util-to-string";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export interface Heading {
  level: number;
  text: string;
  id: string;
  line: number;
}

const markdown = unified().use(remarkParse).use(remarkGfm);

function slugify(text: string) {
  return text.normalize("NFC").toLowerCase()
    .replace(/[^\p{L}\p{N}_\s-]/gu, "")
    .replace(/[\s-]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const usedIds = new Set<string>();
  visit(markdown.parse(content), "heading", (node) => {
    const line = node.position?.start.line;
    const text = toString(node, { includeHtml: false }).trim();
    if (!line || node.depth > 3 || !text) return;

    const base = slugify(text) || "heading-" + line;
    let id = base;
    for (let suffix = 1; usedIds.has(id); suffix++) {
      id = base + "-" + suffix;
    }
    usedIds.add(id);
    headings.push({ level: node.depth, text, id, line });
  });
  return headings;
}
