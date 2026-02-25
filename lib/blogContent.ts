export type BlogStatus = 'draft' | 'published';

export type BlogFaqItem = {
  question: string;
  answer: string;
};

export type BlogUpsertData = {
  category_id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  content_markdown: string;
  content_html: string;
  content_json: Record<string, unknown>;
  cover_image_url: string | null;
  cover_image_alt: string;
  author_name: string;
  status: BlogStatus;
  published_at: string | null;
  meta_title: string;
  meta_description: string;
  canonical_url: string | null;
  og_image_url: string | null;
  og_image_alt: string;
  primary_keyword: string;
  secondary_keywords: string[];
  schema_faq: BlogFaqItem[];
  reading_time_minutes: number;
};

type ProseMirrorNode = {
  type?: unknown;
  text?: unknown;
  content?: unknown;
};

export function toSlug(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function escapeHtml(raw: string) {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function inlineMarkdownToHtml(line: string) {
  let out = escapeHtml(line);
  out = out.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>');
  out = out.replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img src="$2" alt="$1" loading="lazy" />');
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  out = out.replace(/`([^`]+)`/g, '<code>$1</code>');
  return out;
}

export function markdownToHtml(markdown: string) {
  const lines = markdown.replace(/\r/g, '').split('\n');
  const html: string[] = [];
  let inUl = false;
  let inOl = false;
  let inCode = false;

  const closeLists = () => {
    if (inUl) {
      html.push('</ul>');
      inUl = false;
    }
    if (inOl) {
      html.push('</ol>');
      inOl = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.startsWith('```')) {
      closeLists();
      if (!inCode) {
        html.push('<pre><code>');
      } else {
        html.push('</code></pre>');
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      html.push(`${escapeHtml(rawLine)}\n`);
      continue;
    }

    if (!line.trim()) {
      closeLists();
      continue;
    }

    if (line.startsWith('### ')) {
      closeLists();
      html.push(`<h3>${inlineMarkdownToHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('## ')) {
      closeLists();
      html.push(`<h2>${inlineMarkdownToHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('# ')) {
      closeLists();
      html.push(`<h1>${inlineMarkdownToHtml(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('> ')) {
      closeLists();
      html.push(`<blockquote>${inlineMarkdownToHtml(line.slice(2))}</blockquote>`);
      continue;
    }

    if (/^- /.test(line)) {
      if (inOl) {
        html.push('</ol>');
        inOl = false;
      }
      if (!inUl) {
        html.push('<ul>');
        inUl = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(line.slice(2))}</li>`);
      continue;
    }

    if (/^\d+\. /.test(line)) {
      if (inUl) {
        html.push('</ul>');
        inUl = false;
      }
      if (!inOl) {
        html.push('<ol>');
        inOl = true;
      }
      html.push(`<li>${inlineMarkdownToHtml(line.replace(/^\d+\. /, ''))}</li>`);
      continue;
    }

    closeLists();
    html.push(`<p>${inlineMarkdownToHtml(line)}</p>`);
  }

  closeLists();
  if (inCode) html.push('</code></pre>');
  return html.join('\n');
}

export function estimateReadingTimeMinutes(markdown: string) {
  const words = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*`[\]()-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 220));
}

export function estimateReadingTimeFromText(text: string) {
  const words = text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.round(words / 220));
}

export function htmlToPlainText(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeEditorJson(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object') {
    return { type: 'doc', content: [] };
  }

  const node = input as ProseMirrorNode;
  const type = typeof node.type === 'string' ? node.type : '';
  const maybeContent = Array.isArray(node.content) ? node.content : null;

  if (type !== 'doc' || !maybeContent) {
    return { type: 'doc', content: [] };
  }

  return input as Record<string, unknown>;
}

export function normalizeKeywords(input: string | string[] | undefined | null) {
  if (!input) return [] as string[];
  if (Array.isArray(input)) {
    return input.map((value) => value.trim()).filter(Boolean).slice(0, 12);
  }
  return input
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function normalizeFaq(input: unknown): BlogFaqItem[] {
  if (!Array.isArray(input)) return [];
  const items = input
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const question = typeof (entry as { question?: unknown }).question === 'string'
        ? (entry as { question: string }).question.trim()
        : '';
      const answer = typeof (entry as { answer?: unknown }).answer === 'string'
        ? (entry as { answer: string }).answer.trim()
        : '';
      if (!question || !answer) return null;
      return { question, answer };
    })
    .filter((entry): entry is BlogFaqItem => Boolean(entry));

  return items.slice(0, 10);
}
