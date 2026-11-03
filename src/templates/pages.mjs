// The 404 page. Blog pages live in ./blog/.
import { html } from './common.mjs';

export function notFoundBody(ctx) {
  const { ui, root } = ctx;
  return html`
<section class="section notfound">
  <div class="container">
    <p class="notfound-code">${ui.notFound.code}</p>
    <h1>${ui.notFound.title}</h1>
    <p class="lede">${ui.notFound.body}</p>
    <p class="notfound-path"><code data-404-path></code></p>
    <p class="notfound-suggest" data-404-suggest hidden>${ui.notFound.suggest} <a href="${root}" data-404-suggest-link>${ui.notFound.home}</a></p>
    <div class="actions">
      <a class="btn btn-primary" href="${root}">${ui.notFound.home}</a>
      <a class="btn btn-secondary" href="${root}blog/">${ui.nav.blog}</a>
      <a class="btn btn-secondary" href="${root}fr/" lang="fr" hreflang="fr">Version française</a>
    </div>
  </div>
</section>`;
}
