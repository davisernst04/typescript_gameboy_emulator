# Errors

## [ERR-20260312-001] git commit staging removed files

**Logged**: 2026-03-12T12:00:00-06:00
**Priority**: low
**Status**: resolved
**Area**: config

### Summary
`git add` failed because removed files were passed explicitly after they had already been deleted from the working tree.

### Error
```text
fatal: pathspec 'src/cpu.ts.tmp' did not match any files
```

### Context
- Command attempted: `git add .gitignore README.md src/cpu.ts.tmp src/joypad.ts.tmp src/mmu.ts.tmp && git commit ...`
- The files had already been removed with `git rm`, so re-adding them by path was unnecessary.

### Suggested Fix
Use `git add -A` or stage only existing paths plus deletions already recorded by `git rm`.

### Metadata
- Reproducible: yes
- Related Files: .learnings/ERRORS.md

### Resolution
- **Resolved**: 2026-03-12T12:00:00-06:00
- **Commit/PR**: pending
- **Notes**: Retried with `git add -A` before committing.

---
