import { marked } from "marked";
import DOMPurify from "dompurify";

export interface ParsedContent {
  html: string;
  text: string;
  wordCount: number;
  readingTimeMinutes: number;
  headings: ContentHeading[];
  images: ContentImage[];
  links: ContentLink[];
  codeBlocks: ContentCodeBlock[];
  tables: ContentTable[];
  metadata: ContentMetadata;
}

export interface ContentHeading {
  level: number;
  text: string;
  id: string;
  anchor: string;
}

export interface ContentImage {
  src: string;
  alt: string;
  title?: string;
}

export interface ContentLink {
  href: string;
  text: string;
  isExternal: boolean;
}

export interface ContentCodeBlock {
  language: string;
  code: string;
  lineCount: number;
}

export interface ContentTable {
  headers: string[];
  rows: string[][];
}

export interface ContentMetadata {
  title?: string;
  description?: string;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  tags?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  duration?: string;
}

export interface ParseOptions {
  sanitize?: boolean;
  gfm?: boolean;
  breaks?: boolean;
  baseUrl?: string;
  maxDepth?: number;
}

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: false,
});

// Custom renderer for enhanced features
class EnhancedRenderer extends marked.Renderer {
  headings: ContentHeading[] = [];
  images: ContentImage[] = [];
  links: ContentLink[] = [];
  codeBlocks: ContentCodeBlock[] = [];

  heading({ text, depth }: { text: string; depth: number }): string {
    const slug = text
      .toLowerCase()
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "");

    this.headings.push({
      level: depth,
      text: text.replace(/<[^>]*>/g, ""),
      id: slug,
      anchor: `#${slug}`,
    });

    return `<h${depth} id="${slug}">${text}</h${depth}>`;
  }

  image({ href, title, text }: { href: string; title: string | null | undefined; text: string }): string {
    this.images.push({
      src: href,
      alt: text || "",
      title: title || undefined,
    });
    return `<img src="${href}" alt="${text}" title="${title || ""}" loading="lazy" />`;
  }

  link({ href, text }: { href: string; text: string }): string {
    const isExternal = href.startsWith("http") || href.startsWith("//");
    this.links.push({ href, text: text.replace(/<[^>]*>/g, ""), isExternal });
    const target = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<a href="${href}"${target}>${text}</a>`;
  }

  code({ text, lang }: { text: string; lang?: string }): string {
    const language = lang || "text";
    this.codeBlocks.push({
      language,
      code: text,
      lineCount: text.split("\n").length,
    });
    return `<pre><code class="language-${language}">${escapeHtml(text)}</code></pre>`;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Parse markdown content
export function parseMarkdown(
  content: string,
  options: ParseOptions = {}
): ParsedContent {
  const opts = {
    sanitize: true,
    gfm: true,
    breaks: false,
    ...options,
  };

  const renderer = new EnhancedRenderer();

  const html = marked.parse(content, {
    gfm: opts.gfm,
    breaks: opts.breaks,
    renderer: renderer as unknown as marked.Renderer,
  }) as string;

  const sanitizedHtml = opts.sanitize
    ? DOMPurify.sanitize(html, {
        ADD_TAGS: ["iframe"],
        ADD_ATTR: ["allow", "allowfullscreen", "frameborder", "scrolling"],
      })
    : html;

  const text = stripHtml(sanitizedHtml);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const tables = extractTables(content);

  return {
    html: sanitizedHtml,
    text,
    wordCount,
    readingTimeMinutes,
    headings: renderer.headings,
    images: renderer.images,
    links: renderer.links,
    codeBlocks: renderer.codeBlocks,
    tables,
    metadata: extractMetadata(content),
  };
}

// Parse HTML content
export function parseHtml(
  content: string,
  options: ParseOptions = {}
): ParsedContent {
  const opts = {
    sanitize: true,
    ...options,
  };

  const sanitizedHtml = opts.sanitize
    ? DOMPurify.sanitize(content)
    : content;

  const text = stripHtml(sanitizedHtml);
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const wordCount = words.length;
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  const headings = extractHeadingsFromHtml(sanitizedHtml);
  const images = extractImagesFromHtml(sanitizedHtml);
  const links = extractLinksFromHtml(sanitizedHtml);

  return {
    html: sanitizedHtml,
    text,
    wordCount,
    readingTimeMinutes,
    headings,
    images,
    links,
    codeBlocks: [],
    tables: [],
    metadata: {},
  };
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function extractHeadingsFromHtml(html: string): ContentHeading[] {
  const headings: ContentHeading[] = [];
  const regex = /<h([1-6])\s*(?:id="([^"]*)")?[^>]*>(.*?)<\/h[1-6]>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const id = match[2] || "";
    const text = match[3].replace(/<[^>]*>/g, "");
    headings.push({
      level,
      text,
      id: id || text.toLowerCase().replace(/[^\w]+/g, "-"),
      anchor: `#${id || text.toLowerCase().replace(/[^\w]+/g, "-")}`,
    });
  }

  return headings;
}

function extractImagesFromHtml(html: string): ContentImage[] {
  const images: ContentImage[] = [];
  const regex = /<img\s+[^>]*src="([^"]*)"[^>]*(?:alt="([^"]*)")?[^>]*(?:title="([^"]*)")?[^>]*\/?>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    images.push({
      src: match[1],
      alt: match[2] || "",
      title: match[3] || undefined,
    });
  }

  return images;
}

function extractLinksFromHtml(html: string): ContentLink[] {
  const links: ContentLink[] = [];
  const regex = /<a\s+[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const href = match[1];
    const text = match[2].replace(/<[^>]*>/g, "");
    const isExternal = href.startsWith("http") || href.startsWith("//");
    links.push({ href, text, isExternal });
  }

  return links;
}

function extractTables(markdown: string): ContentTable[] {
  const tables: ContentTable[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  while (i < lines.length) {
    if (lines[i].includes("|") && lines[i + 1]?.match(/^\|[\s-:|]+\|$/)) {
      const headers = lines[i]
        .split("|")
        .map((h) => h.trim())
        .filter((h) => h.length > 0);
      i += 2; // Skip separator

      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        const row = lines[i]
          .split("|")
          .map((c) => c.trim())
          .filter((c) => c.length > 0);
        rows.push(row);
        i++;
      }

      tables.push({ headers, rows });
    } else {
      i++;
    }
  }

  return tables;
}

function extractMetadata(content: string): ContentMetadata {
  const metadata: ContentMetadata = {};

  // Extract YAML frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const lines = frontmatterMatch[1].split("\n");
    for (const line of lines) {
      const colonIndex = line.indexOf(":");
      if (colonIndex > -1) {
        const key = line.slice(0, colonIndex).trim();
        const value = line.slice(colonIndex + 1).trim();
        if (key && value) {
          if (key === "tags") {
            metadata.tags = value.split(",").map((t) => t.trim());
          } else if (
            key === "title" ||
            key === "description" ||
            key === "author" ||
            key === "publishedAt" ||
            key === "updatedAt" ||
            key === "duration"
          ) {
            (metadata as Record<string, unknown>)[key] = value;
          } else if (key === "difficulty") {
            metadata.difficulty = value as "beginner" | "intermediate" | "advanced";
          }
        }
      }
    }
  }

  return metadata;
}

// Content transformation utilities
export function extractExcerpt(
  content: string,
  maxLength = 200
): string {
  const text = stripHtml(content);
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).replace(/\s+\S*$/, "") + "...";
}

export function createTableOfContents(
  headings: ContentHeading[],
  maxDepth = 3
): string {
  const filtered = headings.filter((h) => h.level <= maxDepth);
  if (filtered.length === 0) return "";

  let html = '<nav class="toc"><h2>Table of Contents</h2><ul>';
  let prevLevel = 0;

  for (const heading of filtered) {
    if (heading.level > prevLevel) {
      for (let i = prevLevel; i < heading.level; i++) {
        html += "<ul>";
      }
    } else if (heading.level < prevLevel) {
      for (let i = heading.level; i < prevLevel; i++) {
        html += "</ul>";
      }
    }
    html += `<li><a href="${heading.anchor}">${heading.text}</a></li>`;
    prevLevel = heading.level;
  }

  for (let i = 1; i < prevLevel; i++) {
    html += "</ul>";
  }
  html += "</ul></nav>";

  return html;
}

export function highlightSearchTerms(
  html: string,
  terms: string[]
): string {
  let result = html;
  for (const term of terms) {
    if (!term) continue;
    const regex = new RegExp(
      `(${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi"
    );
    result = result.replace(
      regex,
      '<mark class="search-highlight">$1</mark>'
    );
  }
  return result;
}

export function countWords(text: string): number {
  return text
    .replace(/<[^>]*>/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0).length;
}

export function estimateReadingTime(text: string, wpm = 200): number {
  const words = countWords(text);
  return Math.max(1, Math.ceil(words / wpm));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

// YouTube/Vimeo embed helpers
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com|youtu\.be)/i.test(url);
}

export function isVimeoUrl(url: string): boolean {
  return /vimeo\.com/i.test(url);
}

export function getYouTubeEmbedUrl(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

export function getVimeoEmbedUrl(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? `https://player.vimeo.com/video/${match[1]}` : null;
}

export function createVideoEmbed(
  url: string,
  width = 640,
  height = 360
): string | null {
  if (isYouTubeUrl(url)) {
    const embedUrl = getYouTubeEmbedUrl(url);
    if (embedUrl) {
      return `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  if (isVimeoUrl(url)) {
    const embedUrl = getVimeoEmbedUrl(url);
    if (embedUrl) {
      return `<iframe width="${width}" height="${height}" src="${embedUrl}" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    }
  }
  return null;
}
