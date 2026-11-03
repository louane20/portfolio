// The blog: index pages (blog/, fr/blog/), post pages (blog/<slug>/) and the post cards
// shared with the home page.
import { html, raw, t, fmtDay, icon } from '../common.mjs';
import { coverSvg } from './covers.mjs';
import { renderMarkdown } from './markdown.mjs';
import { CATEGORIES } from '../../../scripts/lib/content.mjs';

export const blogHref = (ctx) => (ctx.lang === 'en' ? `${ctx.root}blog/` : `${ctx.root}fr/blog/`);
export const postHref = (ctx, post) => `${ctx.root}blog/${post.slug}/`;
const homeHref = (ctx) => (ctx.lang === 'en' ? ctx.root || './' : `${ctx.root}fr/`);

function avatar(ctx, cls = 'avatar') {
  const p = ctx.profile.person;
  return p.photo
    ? html`<img class="${cls}" src="${ctx.root}${p.photo}" alt="" width="44" height="44">`
    : html`<span class="${cls}" aria-hidden="true">${p.given_name[0]}${p.family_name[0]}</span>`;
}

const catLabel = (ctx, category) => ctx.ui.blog.categories[category];

function meta(ctx, post, { category = true } = {}) {
  const { ui } = ctx;
  return html`<p class="post-meta">${category ? html`<span class="cat cat-${post.category}">${catLabel(ctx, post.category)}</span>` : ''}<time datetime="${post.date}">${fmtDay(post.date, ui)}</time><span class="post-minutes">${icon.clock}${post.minutes} ${ui.minRead}</span></p>`;
}

/** A card linking to a post. The title link is stretched over the whole card. */
export function postCard(ctx, post, { level = 3, uid, hidden = false } = {}) {
  const other = post.lang !== ctx.lang;
  const h = (inner) => (level === 2 ? html`<h2 class="card-title">${inner}</h2>` : html`<h3 class="card-title">${inner}</h3>`);
  return html`
      <li class="post-card" data-category="${post.category}"${hidden ? raw(' data-featured') : ''}${other ? raw(` lang="${post.lang}"`) : ''}>
        <div class="card-cover">${raw(coverSvg(post.cover, uid))}</div>
        <div class="card-body">
          ${meta(ctx, post)}
          ${h(html`<a href="${postHref(ctx, post)}"${other ? raw(` hreflang="${post.lang}"`) : ''}>${post.title}</a>`)}
          <p class="card-summary">${post.summary}</p>
        </div>
      </li>`;
}

function featureCard(ctx, post) {
  const { ui } = ctx;
  const other = post.lang !== ctx.lang;
  return html`
    <article class="feature-card" data-category="${post.category}"${other ? raw(` lang="${post.lang}"`) : ''}>
      <div class="feature-cover">${raw(coverSvg(post.cover, `f-${post.slug}`))}</div>
      <div class="feature-body">
        <p class="feature-label">${ui.blog.featured}</p>
        ${meta(ctx, post)}
        <h2 class="feature-title"><a href="${postHref(ctx, post)}"${other ? raw(` hreflang="${post.lang}"`) : ''}>${post.title}</a></h2>
        <p class="feature-summary">${post.summary}</p>
        <p class="feature-more" aria-hidden="true">${ui.blog.readArticle}${icon.arrowRight}</p>
      </div>
    </article>`;
}

function authorChip(ctx) {
  const { profile, lang } = ctx;
  const p = profile.person;
  return html`<a class="author-chip" href="${homeHref(ctx)}">${avatar(ctx)}<span><strong>${p.name}</strong><span>${t(p.role, lang)}, ${t(p.location, lang).split(',')[0]}</span></span></a>`;
}

/** Blog index. Posts are written in English; the French index says so. */
export function blogIndexBody(ctx) {
  const { profile, lang, ui, posts, root } = ctx;
  const b = profile.blog;
  const featured = posts.find((p) => p.featured) ?? posts[0];
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c, posts.filter((p) => p.category === c).length]));
  const used = CATEGORIES.filter((c) => counts[c]);
  return html`
<section class="blog-hero">
  <div class="container blog-hero-inner">
    <p class="kicker">${ui.blog.kicker}</p>
    <h1 class="blog-title">${t(b.title, lang)}</h1>
    <p class="lede">${t(b.lede, lang)}</p>
    <div class="blog-hero-meta">
      ${authorChip(ctx)}
      <a class="btn btn-secondary btn-sm" href="${root}feed.xml" type="application/atom+xml">${icon.rss}<span>${ui.blog.subscribe}</span><span class="sr-only"> (${ui.blog.rss})</span></a>
    </div>
    ${lang !== 'en' ? html`<p class="lang-note">${ui.blog.inEnglish}</p>` : ''}
  </div>
</section>
${
  featured
    ? html`<section class="blog-featured" data-featured-section>
  <div class="container">${featureCard(ctx, featured)}
  </div>
</section>`
    : ''
}
<section class="blog-list" aria-labelledby="all-articles">
  <div class="container">
    <div class="blog-toolbar">
      <h2 class="blog-list-title" id="all-articles">${ui.blog.allArticles}</h2>
      <div class="filters" role="group" aria-label="${ui.blog.filterLabel}" data-filters>
        <button type="button" class="filter" data-filter="all" aria-pressed="true">${ui.blog.all}<span class="filter-count">${posts.length}</span></button>
        ${used.map(
          (c) => html`<button type="button" class="filter" data-filter="${c}" aria-pressed="false"><span class="cat-dot cat-${c}" aria-hidden="true"></span>${catLabel(ctx, c)}<span class="filter-count">${counts[c]}</span></button>`,
        )}
      </div>
    </div>
    <p class="sr-only" data-filter-status aria-live="polite"></p>
    <ul class="post-grid" data-post-grid data-filter="all">
      ${posts.map((post) => postCard(ctx, post, { uid: `g-${post.slug}`, hidden: post === featured }))}
    </ul>
    <p class="blog-empty" data-filter-empty hidden>${ui.blog.empty}</p>
  </div>
</section>`;
}

function shareLinks(ctx, post, url) {
  const { ui } = ctx;
  const linkedin = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mail = `mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(`${post.summary}\n\n${url}`)}`;
  return html`
      <div class="share">
        <p class="share-title">${icon.share}<span>${ui.blog.share}</span></p>
        <ul class="share-list">
          <li><a class="btn btn-secondary btn-sm" href="${linkedin}" rel="noopener">LinkedIn${icon.external}</a></li>
          <li><a class="btn btn-secondary btn-sm" href="${mail}">${icon.mail}<span>${ui.email}</span></a></li>
          <li><button type="button" class="copy-btn btn-copy-link" data-copy="${url}" data-toast-text="${ui.client.linkCopied}">${icon.link}<span>${ui.blog.copyLink}</span></button></li>
        </ul>
      </div>`;
}

function authorBox(ctx) {
  const { profile, lang, ui } = ctx;
  const p = profile.person;
  return html`
      <div class="author-box">
        ${avatar(ctx, 'avatar avatar-lg')}
        <div class="author-text">
          <p class="author-label">${ui.blog.writtenBy}</p>
          <p class="author-name">${p.name}</p>
          <p class="author-bio">${t(profile.blog.author_bio, lang)}</p>
          <ul class="author-links">
            <li><a href="${homeHref(ctx)}">${ui.blog.moreAbout}</a></li>
            <li><a href="${p.links.linkedin}" rel="me noopener">LinkedIn</a></li>
            <li><a href="${p.links.github}" rel="me noopener">GitHub</a></li>
            <li><a href="${ctx.root}feed.xml" type="application/atom+xml">${ui.blog.rss}</a></li>
          </ul>
        </div>
      </div>`;
}

function neighbour(ctx, post, dir) {
  if (!post) return html`<span class="post-nav-gap"></span>`;
  const { ui } = ctx;
  return html`<a class="post-nav-link is-${dir}" href="${postHref(ctx, post)}"><span class="post-nav-label">${dir === 'prev' ? icon.arrowLeft : ''}${dir === 'prev' ? ui.blog.previous : ui.blog.next}${dir === 'next' ? icon.arrowRight : ''}</span><span class="post-nav-title">${post.title}</span></a>`;
}

/** A post page. `older` and `newer` are the neighbouring posts (or undefined). */
export function postBody(ctx, post, { older, newer, url }) {
  const { ui } = ctx;
  const { html: body, toc } = renderMarkdown(post.body, { ui });
  const blog = blogHref(ctx);
  return html`
<div class="read-progress" aria-hidden="true"><span data-read-progress></span></div>
<article class="post" lang="${post.lang}" data-post>
  <header class="post-head">
    <div class="container post-head-inner">
      <nav class="crumbs" aria-label="${ui.blog.breadcrumb}">
        <ol>
          <li><a href="${homeHref(ctx)}">${ui.blog.portfolio}</a></li>
          <li><a href="${blog}">${ui.blog.kicker}</a></li>
          <li><a href="${blog}?topic=${post.category}">${catLabel(ctx, post.category)}</a></li>
        </ol>
      </nav>
      <h1 class="post-title">${post.title}</h1>
      <p class="post-lede">${post.summary}</p>
      <div class="byline">
        ${avatar(ctx)}
        <div class="byline-text">
          <p class="byline-name">${ctx.profile.person.name}</p>
          ${meta(ctx, post, { category: false })}
          ${post.updated !== post.date ? html`<p class="byline-updated">${ui.blog.updated} <time datetime="${post.updated}">${fmtDay(post.updated, ui)}</time></p>` : ''}
        </div>
      </div>
    </div>
    <div class="container"><div class="post-cover">${raw(coverSvg(post.cover, `p-${post.slug}`))}</div></div>
  </header>
  <div class="container post-layout${toc.length >= 3 ? '' : ' no-toc'}">
    ${
      toc.length >= 3
        ? html`<div class="post-aside"><nav class="toc" aria-labelledby="toc-title" data-toc>
      <p class="toc-title" id="toc-title">${ui.blog.onThisPage}</p>
      <ol>${toc.map((h) => html`<li><a href="#${h.id}">${h.text}</a></li>`)}</ol>
    </nav></div>`
        : ''
    }
    <div class="prose post-body" data-post-body>${raw(body)}</div>
  </div>
  <footer class="container post-foot">
    <div class="post-foot-inner">
      <ul class="topic-list" aria-label="${ui.blog.tags}">${post.tags.map((tag) => html`<li>${tag}</li>`)}</ul>
      ${shareLinks(ctx, post, url)}
      ${authorBox(ctx)}
      <nav class="post-nav" aria-label="${ui.blog.allArticles}">
        ${neighbour(ctx, older, 'prev')}
        ${neighbour(ctx, newer, 'next')}
      </nav>
      <p class="post-back"><a class="btn btn-ghost" href="${blog}">${icon.arrowLeft}<span>${ui.blog.allArticles}</span></a></p>
    </div>
  </footer>
</article>`;
}

/** Structured data for the blog index. */
export function blogJsonLd(ctx, url) {
  const { profile, lang, posts, build } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: `${profile.person.name}: ${t(profile.blog.title, lang)}`,
    description: t(profile.blog.description, lang),
    url,
    inLanguage: lang,
    author: { '@type': 'Person', name: profile.person.name, url: build.siteUrl },
    blogPost: posts.map((p) => ({
      '@type': 'BlogPosting',
      headline: p.title,
      url: `${build.siteUrl}blog/${p.slug}/`,
      datePublished: p.date,
      inLanguage: p.lang,
    })),
  };
}

export function postJsonLd(ctx, post, { url, image }) {
  const { profile, build } = ctx;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    url,
    mainEntityOfPage: url,
    image,
    datePublished: post.date,
    dateModified: post.updated,
    inLanguage: post.lang,
    articleSection: ctx.ui.blog.categories[post.category],
    keywords: post.tags.join(', '),
    wordCount: post.words,
    author: { '@type': 'Person', name: profile.person.name, url: build.siteUrl, sameAs: [profile.person.links.linkedin, profile.person.links.github] },
    isPartOf: { '@type': 'Blog', name: `${profile.person.name}: ${t(profile.blog.title, 'en')}`, url: `${build.siteUrl}blog/` },
  };
}
