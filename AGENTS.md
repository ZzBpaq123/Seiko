# Repository Guidelines

## Project Structure & Module Organization

- `seiko-work-service/`: Java 21, Spring Boot 3.4, and MyBatis-Plus backend. Sources live under `src/main/java/com/seiko/work/`, organized into controllers, services, mappers, entities, DTOs, and VOs. Configuration and database schema live in `src/main/resources/`; tests mirror packages under `src/test/java/`.
- `seiko-work-ui/`: Next.js 15, React 19, TypeScript, and Tailwind CSS 4 frontend. `app/` contains the application shell and global styles; `components/` contains panels; `hooks/` contains shared hooks; `lib/` contains API clients, types, and utilities.
- Navigation uses hash routes such as `#mail` and `#bill`. Add panels through `app/page.tsx` and `components/SideNav.tsx`.

## Build, Test, and Development Commands

Run commands from the relevant module directory.

- Backend prerequisites: JDK 21+, Maven 3.9+, MySQL 8, and Redis 7. Initialize MySQL using `src/main/resources/db/schema.sql`.
- Set `CRYPTO_KEY`, then `mvn spring-boot:run "-Dspring-boot.run.profiles=dev"`: start the API on port 1001; Swagger is at `/swagger-ui.html`.
- `mvn test`: run backend tests; `mvn test -Dtest=CryptoUtilTest` selects one class.
- `mvn clean package`: test and build `target/seiko-work-service.jar`.
- Frontend: `npm install`, then `npm run dev` to serve port 3000.
- `npm run build` / `npm start`: build and serve the production frontend.
- `npx tsc --noEmit`: check TypeScript. `npm run lint` declares `next lint`, but no ESLint configuration is checked in; verify lint setup before relying on it.

## Coding Style & Naming Conventions

Use four-space Java indentation and two-space TypeScript indentation. Follow existing double quotes and semicolons in TypeScript. Use PascalCase component/class names, camelCase functions, and `useX` hook names. Preserve strict TypeScript and `@/` imports. No formatter configuration is checked in.

Keep controllers thin; place business logic and ownership checks in services. Return `Result<T>` and VOs. Use annotation/Lambda-based mappers and shared `lib/axios.ts` requests.

## Testing Guidelines

Backend tests use JUnit 5 through Spring Boot Test. Name classes `*Test.java`; cover changed behavior and failure cases. Enable local Redis concurrency tests with `mvn test "-Dverification.redis.tests=true"`. Frontend request tests use `npm test` (Node test runner). No coverage threshold is configured. For UI changes, run type checking and a production build, then verify affected routes and themes.

## Commit & Pull Request Guidelines

Follow history: `feat(scope): description`, `fix(scope): description`, or `refactor(scope): description`; Chinese descriptions are common. Keep commits focused. PRs should explain behavior changes, link relevant issues, list validation, and include screenshots for visual changes.

## Security & Configuration

Supply `MYSQL_PASSWORD`, `CRYPTO_KEY`, and mail credentials through environment variables; never commit secrets. Configure the frontend with `NEXT_PUBLIC_API_BASE_URL`. Preserve user ownership checks and sanitize external email HTML through `lib/mailHtml.ts` before rendering.
