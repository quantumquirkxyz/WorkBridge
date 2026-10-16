---
description: "Design and implement compilers and interpreters — lexer, parser, AST, type checking, code generation, optimization — with correctness and modularity."
---
# compilers

When to use: Design and implement compilers and interpreters — lexer, parser, AST, type checking, code generation, optimization — with correctness and modularity.

## Workflow

1. **Define the grammar** — EBNF, ensure it is unambiguous
2. **Implement the lexer** — token stream, handle lexing errors
3. **Implement the parser** — recursive descent, LL(1), or LR
4. **Build the AST** — visitor pattern for traversal
5. **Add semantic analysis** — scope, type checking, symbol table
6. **Generate output** — bytecode, IR, or native code
7. **Add optimization passes** — dead code elimination, constant folding
8. **Write tests** — golden tests, fuzzing, property-based testing

## Deliverables

- compilers artifact

## Guardrails

- risk: low; trust tier: 1; approval required: no
- side effects: none
- isolation: none; model tier: reasoning

Stop when: Design and implement compilers and interpreters complete; artifact saved; completion criteria checked.
