# Test Anti-Patterns Reference

These patterns produce tests that pass by construction, break on refactors, or verify imaginary behavior.

## Implementation-Coupled Tests

**Definition:** A test that depends on internal structure rather than external behavior.

**Signs:**
- Mocks internal collaborators and asserts on mock call counts or arguments
- Tests private methods or internal state directly
- Verifies through a side channel (queries the database instead of using the interface)
- Breaks when implementation is refactored but the external behavior is unchanged

**Why it fails:** The test encodes the current implementation shape, not the required behavior. Refactoring changes implementation without changing behavior. A good test should survive refactoring.

**Fix:** Test only through the public interface. Remove mocks of internals. Verify the observable output, not the internal steps that produced it.

## Tautological Tests

**Definition:** An assertion that recomputes the expected value using the same logic as the implementation.

**Examples:**
```
expect(add(a, b)).toBe(a + b)
expect(result.map(f)).toEqual(expected.map(f))
expect(snapshot).toEqual(generateSnapshot())
```

**Why it fails:** The test can never disagree with the code. Both sides run the same algorithm. A bug in the algorithm passes the test by construction.

**Fix:** Expected values must come from an independent source: a known-good literal, a worked example, the specification document, or a separate trusted implementation.

## Horizontal Slicing

**Definition:** Writing all tests for a feature first, then all implementation.

**Why it fails:**
- Tests verify imagined behavior — the shape of things rather than user-facing behavior
- Tests go insensitive to real changes because they verify structure, not behavior
- You commit to test structure before understanding the implementation
- No incremental value — the feature is not demoable until all tests pass

**Fix:** Work in vertical slices — one test, one implementation, repeat. Each cycle is a tracer bullet that responds to what the previous cycle taught you.

## Snapshot Without Context

**Definition:** A snapshot test that captures output without documenting why that output is correct.

**Fix:** Every snapshot must have a corresponding explanation of what behavior it represents. Snapshots without context rot silently as the codebase evolves.
