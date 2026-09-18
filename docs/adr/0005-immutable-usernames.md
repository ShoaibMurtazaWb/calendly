# ADR 0005: Immutable usernames

## Status

Accepted (v0.1.0)

## Context

Public URLs are `/public/:username/:eventSlug`. Changing a username without redirects breaks shared links.

## Decision

Usernames are unique, lowercase slug-like (`[a-z0-9]+(?:-[a-z0-9]+)*`, length 3–32), reserved-name blocked, and **immutable after signup**. No reservation or redirect table in v0.1.

## Consequences

- Stable public URLs
- Rebranding a handle later requires a new ADR (change + redirects + reservation)

## Alternatives

- Mutable username with 301 redirects — more product flexibility, extra Week 1 complexity
