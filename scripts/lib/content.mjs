// Loads content/profile.yaml and content/blog/*.md, validates them, and
// returns plain objects for the templates. Fails loudly on any problem.
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import Ajv2020 from 'ajv/dist/2020.js';
import { COVERS } from '../../src/templates/blog/covers.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CONTENT_DIR = path.join(ROOT, 'content');
export const LANGS = ['en', 'fr', 'ar'];
/** URL prefix of a language: '' for English (the default), 'fr/', 'ar/'. */
export const langPrefix = (lang) => (lang === 'en' ? '' : `${lang}/`);

export class ContentError extends Error {}

/** Resolve a translatable value for a language. */
export const t = (value, lang) => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object' && !Array.isArray(value)) return value[lang] ?? value.en;
  return String(value);
};

function crossCheck(profile) {
  const problems = [];
  const ids = new Map();
  const register = (id, where) => {
    if (ids.has(id)) problems.push(`duplicate id "${id}" in ${where} (already used in ${ids.get(id)})`);
    ids.set(id, where);
  };
  profile.experience.items.forEach((i) => register(i.id, 'experience'));
  profile.education.items.forEach((i) => register(i.id, 'education'));
  profile.projects.items.forEach((i) => register(i.id, 'projects'));
  profile.credentials.certifications.forEach((i) => register(i.id, 'credentials.certifications'));
  profile.credentials.awards.forEach((i) => register(i.id, 'credentials.awards'));

  const areaIds = new Set();
  for (const area of profile.expertise.areas) {
    if (areaIds.has(area.id)) problems.push(`duplicate expertise area id "${area.id}"`);
    areaIds.add(area.id);
    const seen = new Set();
    for (const tool of [...area.production, ...(area.other ?? [])]) {
      if (seen.has(tool)) problems.push(`expertise area "${area.id}" lists "${tool}" twice`);
      seen.add(tool);
    }
  }
  const panels = profile.research.figure.panels.map((p) => p.id).join(',');
  if (panels !== 'flat,network,mesh') problems.push('research.figure.panels must be, in order: flat, network, mesh');
  const sorted = [...profile.experience.items].sort((a, b) => String(b.start).localeCompare(String(a.start)));
  if (sorted.some((item, i) => item !== profile.experience.items[i])) {
    problems.push('experience.items must be listed newest first');
  }
  return problems;
}

export async function loadProfile() {
  const source = await readFile(path.join(CONTENT_DIR, 'profile.yaml'), 'utf8');
  const doc = YAML.parseDocument(source, { prettyErrors: true });
  if (doc.errors.length) {
    throw new ContentError(`profile.yaml is not valid YAML:\n${doc.errors.map((e) => e.message).join('\n')}`);
  }
  const profile = doc.toJS();
  const schema = JSON.parse(await readFile(path.join(CONTENT_DIR, 'schema.json'), 'utf8'));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  const validate = ajv.compile(schema);
  if (!validate(profile)) {
    const lines = validate.errors.map((e) => `  ${e.instancePath || '(root)'} ${e.message}`);
    throw new ContentError(`profile.yaml does not match content/schema.json:\n${lines.join('\n')}`);
  }
  const problems = crossCheck(profile);
  if (problems.length) {
    throw new ContentError(`profile.yaml has inconsistent references:\n  ${problems.join('\n  ')}`);
  }
  return profile;
}

const FRONT_MATTER = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
const POST_FIELDS = ['title', 'date', 'summary', 'tags', 'category', 'cover'];
export const CATEGORIES = ['platform', 'security', 'delivery', 'open-source'];

/** Blog posts: content/blog/<slug>.md with YAML front matter. Newest first. */
export async function loadPosts({ drafts = false } = {}) {
  const dir = path.join(CONTENT_DIR, 'blog');
  const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
  const posts = [];
  for (const file of files) {
    const where = `content/blog/${file}`;
    const source = await readFile(path.join(dir, file), 'utf8');
    const match = FRONT_MATTER.exec(source.replace(/\r\n/g, '\n'));
    if (!match) throw new ContentError(`${where}: missing front matter`);
    const meta = YAML.parse(match[1]);
    if (meta.draft && !drafts) continue;
    for (const field of POST_FIELDS) {
      if (meta[field] === undefined) throw new ContentError(`${where}: missing "${field}" in front matter`);
    }
    const date = String(meta.date);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new ContentError(`${where}: date must be YYYY-MM-DD`);
    if (!CATEGORIES.includes(meta.category)) {
      throw new ContentError(`${where}: category must be one of ${CATEGORIES.join(', ')}`);
    }
    if (!COVERS.includes(meta.cover)) throw new ContentError(`${where}: cover must be one of ${COVERS.join(', ')}`);
    const body = match[2];
    const words = body
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
    posts.push({
      slug: file.replace(/\.md$/, ''),
      title: meta.title,
      date,
      updated: meta.updated ? String(meta.updated) : date,
      summary: meta.summary,
      tags: meta.tags,
      category: meta.category,
      cover: meta.cover,
      lang: meta.lang ?? 'en',
      draft: Boolean(meta.draft),
      featured: Boolean(meta.featured),
      words,
      minutes: Math.max(1, Math.round(words / 220)),
      body,
    });
  }
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.title.localeCompare(b.title));
}
