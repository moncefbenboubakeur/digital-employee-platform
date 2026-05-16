# Reusable Core Transfer Pack

This folder captures what should move from the existing AlgeriaTechGen video studio into the new digital-employee startup.

The goal is not to copy the whole application. AlgeriaTechGen is a batch article-to-video tool. The new startup is a live, customer-facing assistant platform. The useful transfer is the architecture pattern: adapters, jobs, catalogs, media artifacts, logs, caching, and fallback modes.

## Files

- [01 Transfer Strategy](01-transfer-strategy.md)
- [02 Source Module Map](02-source-module-map.md)
- [03 Target Startup Architecture](03-target-startup-architecture.md)
- [04 Adapter Contracts Draft](04-adapter-contracts-draft.md)
- [05 Migration Roadmap](05-migration-roadmap.md)
- [06 Commercial And Licensing Notes](06-commercial-and-licensing-notes.md)

## Transfer Principle

Move the reusable core, not the AlgeriaTech product.

Keep:

- Engine adapter pattern
- Job orchestration pattern
- Provider catalogs
- Storage and artifact discipline
- Logs and recovery
- Cached generated media concept
- Cost-aware fallback thinking

Do not keep as core startup concepts:

- Decision Radar
- Article scraping as a platform primitive
- YouTube packaging
- AlgeriaTech-specific script sections
- Non-commercial local AI engines as production dependencies

## Recommended New Repo Direction

Use a fresh repo for the startup:

```txt
digital-employee-platform/
  apps/
    admin-dashboard/
    kiosk-player/
    api/
  packages/
    core/
    adapters/
    jobs/
    media/
    knowledge/
    answer-cache/
    billing/
    observability/
```

AlgeriaTechGen can remain the internal content studio. The new platform should import ideas from it, not inherit its product constraints.
