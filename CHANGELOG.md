# Changelog

## 0.4.0 — 2026-07-22

### Features

- Add direct Gemini support with multimodal input.
- Add OpenRouter Auto for access to a wider model catalog through one key.
- Rewrite a generated draft in one click: Shorter, Natural, or Wittier.

### Improvements

- Update setup instructions for automatic saving.
- Keep quick rewrites grounded in both the source post and current draft.

## 0.3.1 — 2026-07-22

### Improvements

- Reduce first-run setup to choosing a model and pasting an API key.
- Auto-save every setting and move optional controls into a collapsed Personalize section.
- Preserve image-reading preference while using a model without image support.

## 0.3.0 — 2026-07-22

### Features

- Preview the exact post, parent conversation, quoted content, and detected image labels Quip read before generating.
- Replace the outdated mutual-follow landing-page demo with an independent-developer use case.

## 0.2.5 — 2026-07-22

### Improvements

- Enable high-effort thinking for DeepSeek V4 Flash reply generation.
- Increase DeepSeek's internal token budget while keeping final replies short.
- Keep API-key connection tests fast by leaving thinking disabled there.

## 0.2.4 — 2026-07-15

### Improvements

- Let Grok 4.3 use low reasoning effort instead of disabling reasoning.
- Read literal meaning, speech act, final-line reversal, and quoted-post relationships before drafting.
- Keep replies short while giving Grok enough token budget for internal reasoning.

## 0.2.3 — 2026-07-13

### Improvements

- Identify whether the author is sharing, venting, joking, asking, or announcing before drafting a reply.
- Anchor replies to a concrete detail, implication, contrast, or callback from the post.
- Give each reply style a distinct writing strategy and reject generic AI agreement phrases.
- Reject replies that are reusable across unrelated posts, speculate beyond the source, or explain their own joke.

## 0.2.2 — 2026-07-13

- Show exactly how many parent posts and images are included in each AI request.
- Keep generated replies short, grounded, and in the user's speaking role.
- Read recent parent posts, images, video covers, and nested quoted posts.
- Add bilingual extension UI, landing page, and documentation.
