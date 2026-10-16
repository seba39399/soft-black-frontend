---
name: sof-black-frontend
description: Generates Next.js/React frontend components for Soft Black Discográfica. Use when the user asks to build UI elements, pages, audio players, artist profiles, or radio features with an underground, dirty, graffiti-inspired Jamundí hip-hop aesthetic.
---
# Soft Black Discográfica - Frontend Generator

Generates Next.js 16.2.6 and React 19.2.4 components for the Soft Black Discográfica platform, following strict visual and architectural rules.

## When to Use
- The user asks to build or design UI components for Soft Black.
- Creating audio players, 24/7 YouTube streaming radio features, artist profiles, or event cards.
- Implementing UI that requires the specific "santo oscuro", street, and graffiti aesthetic from Jamundí, Valle del Cauca (zona sur).

## Visual Identity & Styling (Tailwind CSS v4)
- **Vibe:** Underground, dirty, blurry, nocturnal, street style, graffiti culture, "santo oscuro", baggy clothes. Rooted in Jamundí, Valle del Cauca (zona sur) hip-hop scene.
- **Colors:** Backgrounds heavily Black (`#000000`), Text White (`#ffffff`), Accents/CTAs Yellow (`#ffc100`).
- **Aesthetic (Raw/Street/Nocturnal):**
  - Use dirty/blurry effects where appropriate (e.g., `backdrop-blur`, grainy overlays, textured dark backgrounds) to give that nocturnal, street vibe.
  - Avoid soft, modern corporate shadows. Use hard, solid offset shadows (`shadow-[4px_4px_0px_#ffc100]`) or raw brutalist borders to reflect the street/graffiti art style.
  - Avoid highly rounded corners. Use sharp edges: `rounded-none` or `rounded-sm`.
  - Use thick, visible borders to separate elements: `border-2 border-white/20` or `border-2 border-[#ffc100]`.

## Architecture & Stack Rules
- **Stack:** Next.js 16.2.6 (App Router), React 19.2.4, Tailwind v4.
- **Icons:** Use `lucide-react` (one import per icon).
- **Structure:** Follow feature-driven colocation. Components belong in `src/features/<feature-name>/components/`. Pages just route and delegate.
- **Logic & Radio/Streaming:** The 24/7 radio feature relies on embedding a live YouTube stream to save costs. Do not build heavy custom streaming backends; embed the YouTube iframe and style the UI around it to look like a custom radio player.
- **Interactivity:** Use `"use client"` ONLY for components that need state.

## Key Component Patterns
- **Artist Banners:** Use CSS keyframes in Tailwind for infinite auto-scrolling carousels of artist images.
- **24/7 Radio (YouTube Embed):** UI should prominently display the current date and active playlist/stream, wrapping a YouTube live embed.
- **Audio Players:** Custom controls using `lucide-react` icons styled with the high-contrast yellow/black theme and dirty/gritty textures.

## Gotchas
- Do not use generic, clean, "corporate" web designs. The UI must feel gritty, nocturnal, underground, and reflective of the Jamundí graffiti street culture.
- Ensure contrast ratios are legible. Yellow `#ffc100` should ideally be placed against the black background, not white.