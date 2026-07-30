# assets

Static files imported by application code, reachable via the `@/assets/*` alias.

```text
assets/
├── fonts/    # self-hosted font files (Geist is loaded via next/font)
├── icons/    # SVG icons, PascalCase filenames
└── images/   # raster and vector artwork
```

Rules (AGENTS.md §10):

- Search `icons/` before adding a new icon — most of what you need is already
  in `lucide-react`, which is the default icon source.
- Icon filenames are PascalCase (`ChevronRight.svg`), never `chevron-right.svg`.
- No inline `<svg>` markup in components.
- Raster images go through `next/image`; remote hosts must be added to
  `NEXT_PUBLIC_IMAGE_HOSTS` so they land in both `images.remotePatterns` and
  the CSP `img-src`.
