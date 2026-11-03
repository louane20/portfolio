#!/usr/bin/env node
// Validates content/profile.yaml (JSON Schema + cross references) and the notes' front matter.
import { loadProfile, loadNotes, ContentError } from './lib/content.mjs';

try {
  const profile = await loadProfile();
  const notes = await loadNotes({ drafts: true });
  const published = notes.filter((n) => !n.draft).length;
  console.log(
    `content OK: ${profile.expertise.areas.length} expertise areas, ${profile.experience.items.length} positions, ` +
      `${profile.projects.items.length + 1} projects, ${published} published notes (${notes.length - published} drafts)`,
  );
} catch (error) {
  if (error instanceof ContentError) {
    console.error(`::error file=content/profile.yaml::${error.message.split('\n')[0]}`);
    console.error(error.message);
    process.exit(1);
  }
  throw error;
}
