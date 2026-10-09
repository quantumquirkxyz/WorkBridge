# Test Patterns Reference

Good tests share these characteristics regardless of framework or language.

## Public Interface Testing

Test behavior through the public interface only. The test reads like a specification:

```
"checkout returns 402 when cart total exceeds credit limit"   # good
"checkout calls PaymentGateway.debit with 3 arguments"        # bad — tests internals
```

The first test survives a complete rewrite of the payment internals. The second breaks on any refactor.

## Independent Expected Values

Expected values must come from an independent source of truth:

- **Known-good literals** — hard-coded values from the spec or worked examples
- **Spec-derived** — computed from a separate, trusted implementation
- **Domain rules** — business invariants that do not depend on the code under test

Never derive the expected value using the same algorithm as the implementation.

## Seam Selection

Choose the highest seam that verifies the behavior:

1. **API contract** — HTTP endpoint, gRPC method, public function
2. **Module boundary** — exported interface, class contract
3. **Integration seam** — real database, real network, real filesystem

Lower seams (unit tests against internals) are reserved for algorithms with complex branching that cannot be fully exercised at higher seams.

## Tracer Bullet Pattern

Each TDD cycle produces one tracer bullet:

```
1. Write one failing test at a confirmed seam
2. Write only enough code to make it pass
3. Commit
4. Repeat
```

Each bullet establishes a behavior baseline. The accumulating suite is the safety net.

## Refactor Safety

Before refactoring, confirm the test suite is green. After refactoring, confirm it remains green. If a test fails during refactor but behavior has not changed, the test was implementation-coupled — fix the test, not the code.
