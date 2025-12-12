# AGENTS.md - Development Guidelines

## Build/Test/Lint Commands

- `bun run build` - Build the NestJS application
- `bun run lint` - Run ESLint with TypeScript support
- `bun run format` - Format code with Prettier
- `bun run test` - Run all Jest tests
- `bun run test <file-pattern>` - Run specific test file(s) (e.g., `bun run test social-posts`)
- `bun run test:watch` - Run tests in watch mode
- `bun run test:cov` - Run tests with coverage
- `bun run test:e2e` - Run end-to-end tests
- `bun run start:dev` - Start development server with watch mode

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
