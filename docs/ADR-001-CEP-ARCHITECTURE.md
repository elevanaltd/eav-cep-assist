# ADR-001: CEP Panel Architecture for PP Integration

**Status:** Accepted

**Date:** 2025-11-09

**Decision Makers:** Elevana Development Team

---

## Context

The initial implementation was an Electron desktop app with a custom video player. However, this approach had several issues:

1. Complex video streaming protocols needed
2. Duplicate video player when PP already has excellent built-in player
3. Separate application workflow (app → export → import to PP)
4. No real-time integration with PP project

The user suggested: **"When you select a video it would show up in the normal preview window... The CEP panel could be just essentially like a strip where it has each of the fields."**

## Decision

We will implement this as an **Adobe CEP panel** that runs inside Premiere Pro, with the following architecture:

### Core Principles

1. **Leverage PP's Source Monitor** - No custom video player
2. **Selection-aware UI** - React to Project Panel selection like PP's Metadata panel
3. **Horizontal strip layout** - Compact form with essential fields
4. **Direct PP metadata writes** - Update project items in real-time
5. **Phase 2 AI integration** - Scaffold for future enhancements

## Alternatives Considered

### Alternative 1: Electron App with PP Export

**Pros:**
- More control over UI
- Can run independently
- Easier Node.js integration

**Cons:**
- Separate workflow (app → export → import)
- Custom video player complexity
- No real-time PP integration
- Requires file exports/imports

**Decision:** Rejected - Too disconnected from PP workflow

### Alternative 2: UXP Plugin (Next-gen Adobe plugins)

**Pros:**
- Modern JavaScript
- Better performance
- Future-proof

**Cons:**
- Less mature than CEP
- Not all PP versions support UXP
- More complex setup

**Decision:** Rejected for now - CEP is more stable and widely supported

## Consequences

### Positive

1. **Native PP Integration** - Panel feels like part of PP
2. **No Video Player** - Leverage PP's excellent Source Monitor
3. **Real-time Updates** - Metadata written directly to project
4. **Familiar UX** - Works like PP's built-in Metadata panel
5. **Efficient Layout** - Horizontal strip maximizes screen space
6. **Selection-aware** - Automatically loads selected clips
7. **Navigation** - Previous/Next through all project clips

### Negative

1. **PP Dependency** - Can't run standalone
2. **CEP Limitations** - Older technology (though stable)
3. **Installation** - Users must install extension
4. **Debugging** - Harder than Electron (Chrome DevTools via localhost)

---

**Version:** 1.0

**Last Updated:** 2025-11-09
