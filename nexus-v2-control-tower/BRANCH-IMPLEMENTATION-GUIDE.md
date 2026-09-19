# Independent branch and worktree guide

1. Inspect `git status --short`, current branch, remotes, and repository AGENTS instructions. Preserve any existing work.
2. Fetch `origin` and record `origin/nexus-v2` SHA. Read its canonical before selecting scope.
3. If the assigned remote branch exists, create a worktree from that exact branch; do not reset or recreate it from the integration branch. If absent, create it from the verified integration SHA.
4. Use one worktree per worker and one writer per working branch. Example for a NEW branch only: `git worktree add -b nexus-v2-p1-NN-slug ../nexus-v2-p1-NN-slug origin/nexus-v2`.
5. Declare allowed paths in the module contract. This worker is restricted to `nexus-v2-control-tower/**`. Existing Scout paths remain in place; proposed final normalization happens during reconciliation, not by moving another worker's files.
6. Pin shared inputs by commit and schema version. Raise an ACR for shared changes. Never silently copy a newer draft into another module.
7. Run the module tests; inspect the complete diff, including untracked files. Stage explicit allowed paths. Exclude credentials, generated caches and unrelated files.
8. Fetch before pushing. A non-fast-forward means re-read and reconcile concurrent work; never force-push. In connector-only environments create a Git tree based on the verified branch head, create a single-parent commit, then fast-forward the ref and read back the changed blobs.
9. Handoff records source base, reviewed implementation commit, tests and outstanding owner gates. A file cannot contain its own eventual Git commit SHA: record the known parent and verify the resulting commit externally.
10. No Phase One branch is merged directly into `nexus-v2`. No deploy in Workstream 1. CI implementation belongs to Workstream 9; provide a tested local validation command and proposed gate requirements.
