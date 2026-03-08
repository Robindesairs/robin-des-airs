/**
 * Service Blog — Lecture et parsing des articles Markdown (src/content/blog/).
 * Utilisé par le script de build pour générer les pages statiques /blog et /blog/[slug].
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as markedParse } from 'marked';
import matter from 'gray-matter';

const CONTENT_DIR = path.join(process.cwd(), 'src', 'content', 'blog');

export interface BlogPostFrontmatter {
  title: string;
  meta_title: string;
  meta_description: string;
  slug: string;
  image_url?: string;
}

export interface BlogPost {
  slug: string;
  title: string;
  meta_title: string;
  meta_description: string;
  image_url: string;
  html: string;
}

/**
 * Liste tous les slugs (noms de fichiers .md sans extension).
 */
export function getAllSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}

/**
 * Récupère un article par slug. Retourne null si non trouvé.
 */
export function getBySlug(slug: string): BlogPost | null {
  const filePath = path.join(CONTENT_DIR, `${slug}.md`);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  const meta = data as BlogPostFrontmatter;
  const html = (markedParse(content, { async: false }) as string) || '';
  return {
    slug: meta.slug || slug,
    title: meta.title || '',
    meta_title: meta.meta_title || meta.title || '',
    meta_description: meta.meta_description || '',
    image_url: meta.image_url || '/og-blog.png',
    html,
  };
}

/**
 * Liste tous les articles (métadonnées uniquement, pour la page index).
 */
export function getAllPosts(): Omit<BlogPost, 'html'>[] {
  const slugs = getAllSlugs();
  return slugs
    .map((slug) => {
      const filePath = path.join(CONTENT_DIR, `${slug}.md`);
      const raw = fs.readFileSync(filePath, 'utf-8');
      const { data } = matter(raw);
      const meta = data as BlogPostFrontmatter;
      return {
        slug: meta.slug || slug,
        title: meta.title || slug,
        meta_title: meta.meta_title || meta.title || '',
        meta_description: meta.meta_description || '',
        image_url: meta.image_url || '/og-blog.png',
      };
    })
    .filter((p) => p.slug && p.title);
}
