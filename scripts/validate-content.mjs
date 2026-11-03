#!/usr/bin/env node
// Validates content/profile.yaml (JSON Schema + cross references) and the blog posts' front matter.
import { loadProfile, loadPosts, ContentError } from './lib/content.mjs';

try {
  const profile = await loadProfile();
  const posts = await loadPosts({ drafts: true });
  const published = posts.filter((n) => !n.draft).length;
  console.log(
    `content OK: ${profile.expertise.areas.length} expertise areas, ${profile.experience.items.length} positions, ` +
      `${profile.projects.items.length + 1} projects, ${published} published posts (${posts.length - published} drafts)`,
  );
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`::error file=content/profile.yaml::${error.message.split('\n')[0]}`);
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
