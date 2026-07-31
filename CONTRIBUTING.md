# Contributing to Bookshelf

Thanks for your interest in contributing!

## Getting started

1. Fork the repo and create a branch from `main`.
2. Follow the setup instructions in [README.md](README.md) to run the backend and frontend locally.

## Making changes

| Layer | Command |
|---|---|
| Frontend dev server | `cd frontend && npm run dev` |
| Backend dev server | `cd backend && ./mvnw spring-boot:run` |
| Frontend production build | `cd frontend && npm run build` |
| Backend unit tests | `cd backend && ./mvnw test` |
| API integration tests | `cd bookshelf-tests && ../backend/mvnw -f pom.xml test` |

## Code style

- **React**: functional components, hooks, no class components.
- **Java**: standard Spring Boot conventions; add a controller test for new endpoints.
- **CSS**: use existing `--nf-*` CSS variables — do not hard-code colours.
- Keep PRs focused: one feature or fix per pull request.

## Submitting a pull request

1. Ensure `npm run build` passes with no errors.
2. Ensure `./mvnw test` passes.
3. Describe what you changed and why in the PR description.
