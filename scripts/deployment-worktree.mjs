// Skill installation metadata belongs to the user and is outside every release
// allowlist. Product changes and unknown untracked paths must still block release.
export function blockingWorktreeChanges(porcelain) {
  return porcelain
    .split(/\r?\n/u)
    .filter(
      (line) =>
        line && line !== "?? .agents/" && line !== "?? skills-lock.json",
    );
}
