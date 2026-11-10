# Lunar Landing Site Navigator

NASA Space Apps Challenge 2026 project. It compares candidate landing sites near the lunar south pole by the Sun and Earth altitude over time, to find solar-power and direct-to-Earth communication windows.

> Status: base stack only. Project logic starts on Nov 14.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS
- Vitest for unit tests
- ESLint + Prettier
- Deploys on Vercel

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Scripts

| Script                 | What it does                      |
| ---------------------- | --------------------------------- |
| `npm test`             | Run unit tests once               |
| `npm run test:watch`   | Run tests in watch mode           |
| `npm run lint`         | ESLint                            |
| `npm run typecheck`    | Generate Next types and run `tsc` |
| `npm run format`       | Format with Prettier              |
| `npm run format:check` | Check formatting                  |
| `npm run build`        | Production build                  |

## Folders

- `src/app` – Next.js pages
- `src/lib` – pure calculation code and its tests
- `notes/` – research notes and hand-calculated reference cases
