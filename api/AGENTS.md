# AGENTS.md - Development Guidelines

## Build/Lint Commands

- `bun run build` - Build the NestJS application
- `bun run lint` - Run ESLint with TypeScript support
- `bun run format` - Format code with Prettier
- `bun run typecheck` - Type-check without emitting
- `bun run start:dev` - Start development server with watch mode
- `bun run typegen` - Regenerate both Kysely (Kanel) and Supabase types
- `bun run supabase:typegen` - Regenerate just the Supabase Database types
- `bun run kanel:typegen` - Regenerate just the Kysely (Stripe schema) types
- `bun run supabase:start` / `supabase:reset` / `supabase:stop` - Local Supabase lifecycle

## Code Style Guidelines

- Use single quotes and trailing commas (Prettier config)
- Prefer type imports: `import type { Foo } from './foo'`
- Use strict TypeScript settings (strictNullChecks, noImplicitAny)
- Follow NestJS patterns: controllers, services, DTOs, decorators
- Use class-validator and class-transformer for validation
- Error handling: throw HttpException with proper status codes
- Use console.error for logging errors, not console.log
- Naming: camelCase for variables/functions, PascalCase for classes/interfaces
- File naming: kebab-case with appropriate suffixes (.controller.ts, .service.ts, .dto.ts)
- Import order: external libraries first, then relative imports grouped by type
