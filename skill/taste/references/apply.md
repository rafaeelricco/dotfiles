# Apply

Bring a recorded taste into an existing project.

1. Read `catalog/<name>/site.json`, `design.json` and `review.md`.
2. Write its `colors`, `type`, `fonts`, `spacing`, `radius` and `shadows` as CSS custom properties
   in the project's styles, in the project's own token naming; `colors_dark` goes under the
   project's dark selector. A font with a `null` source uses its recorded fallback.
3. Note `taste: <name>` in the project's `.agents/ui.md`.

A value the project needs that `design.json` does not have is a stop and ask, not a guess.
