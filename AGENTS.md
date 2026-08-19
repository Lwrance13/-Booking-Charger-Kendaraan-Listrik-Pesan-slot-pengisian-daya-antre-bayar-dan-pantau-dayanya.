# AGENTS.md

## Project context
This repository defines the architecture for an EV charging booking platform: users can find stations, reserve charging slots, monitor usage, and pay bills. The implementation is currently centered on architecture documentation and ADRs, not a full runtime codebase.

## Primary references
- [README.md](README.md)
- [docs/ARSITEKTUR.md](docs/ARSITEKTUR.md)
- [docs/adr/ADR-001-microservice-decomposition.md](docs/adr/ADR-001-microservice-decomposition.md)
- [docs/adr/ADR-002-komunikasi-antar-service.md](docs/adr/ADR-002-komunikasi-antar-service.md)
- [docs/adr/ADR-003-database-per-service.md](docs/adr/ADR-003-database-per-service.md)
- [docs/adr/ADR-004-slot-locking-redis.md](docs/adr/ADR-004-slot-locking-redis.md)

## Architecture to preserve
- Four bounded contexts: `station-service`, `booking-service`, `session-service`, and `billing-service`.
- Communication is primarily REST for synchronous requests and events for asynchronous notifications.
- Each service owns its own database; do not design cross-service joins or shared tables.
- Slot locking uses Redis with short TTL to prevent race conditions during booking.
- API contracts should use versioned routes like `/api/v1/...` and JSON payloads following the project conventions.

## Conventions
- REST paths: kebab-case, noun plural.
- JSON fields: `camelCase`.
- Database columns: `snake_case`.
- Event names: `SCREAMING_SNAKE_CASE`.
- Service names: kebab-case.
- Response format should stay aligned with the documented envelope and Problem Details style.

## Working rules for agents
- Prefer reading the architecture docs before making design changes.
- Keep changes consistent with the service boundaries and ADR decisions.
- If a feature alters business flow, API contract, or cross-service communication, update the relevant ADR or architecture doc.
- Avoid introducing shared persistence or hidden coupling between services.
- When the repo later grows into code, keep implementation aligned to this architecture rather than inventing a different model.

## Repo-specific guidance
- This repo is documentation-first, so architecture and policy changes are often more important than implementation shortcuts.
- Do not assume there are established runtime build/test commands yet; first check whether the workspace contains service folders or package manifests before proposing commands.
- If a new service is added, keep it aligned with the existing naming, API, and data conventions described in the docs.
