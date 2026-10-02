# Design Exceptions Log

This file tracks all approved exceptions to the design rules specified in [`DESIGN_RULES.md`](../DESIGN_RULES.md).

## Policy
Exceptions must be extremely rare and justified by domain or technical necessity (e.g. third-party widget integration or external compliance requirements). Banned generic styles (such as generic tech purple gradients, sub-14px microcopy, or AI-fluff copy) should never be exempted for convenience.

## Format
To bypass a check for a strictly justified line of code, append an inline comment:
```tsx
// design-check-ignore: <brief reason>
```
or in CSS:
```css
/* design-check-ignore: <brief reason> */
```

Every ignored line in the codebase must also be logged in this document.

---

## Approved Exceptions Registry

| File & Line | Pattern Ignored | Justification | Approved By | Date |
| :--- | :--- | :--- | :--- | :--- |
| *None* | *None* | *No exceptions currently approved.* | - | - |
