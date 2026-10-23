# Feature: product schema + scenario math

1. `how` over the affected subsystem. skip: greenfield, empty repo, nothing to read.
2. `architect` for parallel design exploration. skip: single pure module; shape sketched inline in delegate brief (docs/design.md).
3. Throughput checkpoint:
   - Blocking first steps: git init, package.json/tsconfig/vitest scaffold.
   - Independent workstreams: n/a, one module (schema + math) is code-coupled.
   - Shared mutable state: n/a, one worker, one worktree.
   - Smallest safe decomposition: one opus worker; schema and math share types, splitting would serialize anyway.
4. Delegate code-writing to opus poteto-agent in a worktree.
5. Verify: run tests + typecheck myself, review diff, hand-check one IRR.
6. Small ordered commits.
7. interrogate. skip unless design contested.
8. Opening a PR. skip: no remote; local commits only.
