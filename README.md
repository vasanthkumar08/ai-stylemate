# StyleMate AI

StyleMate AI is a production-oriented AI SaaS foundation for wardrobe uploads and complete outfit recommendations based on occasion, vacation, weather, season, and personal style preferences.

## Stack

- Next.js App Router with TypeScript and Server Actions
- Tailwind CSS for responsive, accessible UI
- Supabase PostgreSQL and Supabase Auth
- Cloudinary for wardrobe image storage
- Zod for validation
- Zustand for lightweight client state
- React Hook Form for ergonomic forms

## Getting Started

1. Install dependencies with `npm install`.
2. Copy `.env.example` values into your local environment.
3. Add Supabase and Cloudinary credentials.
4. Run `npm run dev`.

## Production

- Run the full local gate with `npm run qa`.
- Review [deployment-checklist.md](docs/deployment-checklist.md).
- Review [security-report.md](docs/security-report.md).
- Deploy the Next.js app to Vercel, migrations to Supabase, and media delivery through Cloudinary.

## Architecture Notes

- `src/app` owns routes, layouts, loading states, error boundaries, and API handlers.
- `src/components` contains reusable, app-agnostic UI and layout primitives.
- `src/features` keeps product domains isolated by capability.
- `src/lib` contains integration clients and shared infrastructure utilities.
- `src/config` validates environment configuration with Zod.
- `src/stores` holds client-side state that must survive component boundaries.
- `src/types` contains generated or shared TypeScript contracts.
