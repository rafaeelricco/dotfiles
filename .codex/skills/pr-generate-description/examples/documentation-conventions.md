# Example: Documentation / Refactor PR with Motivation

Style: Concise | Sections: Motivation, What's New, Testing

---

## Motivation

Establish comprehensive coding and type design conventions to help everyone understand the project patterns. This improves codebase consistency, reduces onboarding friction for new contributors, and ensures alignment on functional programming principles, type safety standards, and React component patterns across the team.

## What's New

**Documentation Standards**

- **565e0d2**: Rename STYLE-GUIDE.md to GUIDELINES.md
- **3403dd4**: Standardize dash and colon usage in conventions documentation
- **28f8d54**: Standardize markdown heading capitalization in conventions guide
- **2fb0d77**: Rename top-level heading in CONVENTIONS.md to Conventions

**Code Conventions**

- **c447ccb**: Establish comprehensive coding and type design conventions
  - Expanded from ~74 lines to ~512 lines of comprehensive guidelines
  - Added type design (branded types, discriminated unions, exhaustive pattern matching, `as const` over enums)
  - Added function signatures (explicit return types, strict generics)
  - Added functional patterns (immutable updates, pure functions)
  - Added React patterns (composition over inheritance)
  - Added schema and serialization (explicit schemas, type inference from schemas)
  - Added error handling (result types over exceptions)

## Testing & Feedback

- Review conventions for completeness and accuracy
- Verify formatting consistency across all sections
- Confirm alignment with existing codebase practices
