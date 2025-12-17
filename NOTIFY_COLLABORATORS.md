# URGENT: Repo history rewritten — please re-sync

I force-pushed a cleaned history to the `master` branch to remove a leaked secret from the repository. This rewrites commit IDs and will conflict with existing clones.

Required action (choose one):

- Re-clone (recommended):

```bash
git clone https://github.com/jevdesigns/ReAktive.git
```

- OR hard-reset to the new remote master (destructive to local uncommitted/unpushed work):

```bash
git fetch origin
git reset --hard origin/master
```

Notes:
- If you had local branches with unpushed work, back them up before running the reset.
- If you need help recovering or rebasing work, contact the repository owner.
- Reason: a secret was accidentally committed and has been removed and purged from history.

If you use CI pipelines or deployments that reference the repository, please verify they still operate normally after this change.
