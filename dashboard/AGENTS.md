# Agent Guidelines for Post-for-Me Dashboard

## Commands

- **Build**: `bun run build` (React Router build)
- **Dev**: `bun run dev` (development server)
- **Test**: `bun run test` (Vitest run), `bun run test:watch` (watch mode)
- **Lint**: `bun run lint` (ESLint check), `bun run lint:fix` (auto-fix)
- **Typecheck**: `bun run typecheck` (React Router typegen + tsc)

## Code Style

- **Framework**: React Router v7 with TypeScript (SSR enabled)
- **Runtime**: Bun package manager (use `bun` commands)
- **Imports**: Use `~/` for app imports, group external imports first
- **Components**: PascalCase, export as named functions (use `export function Component()` for routes)
- **Files**: kebab-case for routes, camelCase for utilities
- **Types**: Define interfaces for form data, use Zod schemas for validation
- **Forms**: Use react-hook-form with zodResolver, custom `useFormFetcher` hook from `~/hooks/use-form`
- **UI**: Radix UI components in `~/ui/`, Tailwind CSS v4 classes
- **Error Handling**: Use toast notifications (sonner), validate inputs before submission
- **Async**: Use `fetcher.submit()` for form submissions, `fetcher.load()` for data fetching
- **Naming**: Descriptive names, prefix unused vars with `_` (ESLint enforced)

## Testing

- **Framework**: Vitest with jsdom
- **Single Test**: `bun run test -- path/to/test.spec.ts`
