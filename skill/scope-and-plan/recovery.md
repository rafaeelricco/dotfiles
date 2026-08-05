# Recovery

- **Workers returned overlapping findings** → scopes were not independent.
  Dedupe in the synthesis; do not re-run.
- **A writer stopped partway** → its group is half-applied; the other groups are
  untouched, because groups are disjoint. Name the groups that landed, then apply
  the failed group yourself, serially. Do not respawn the writer, and do not
  revert the groups that succeeded.
- **A writer touched a path outside its Boundaries** → disjointness is void, so no
  other writer's result is trustworthy for that path either. Stop, show the diff,
  let the user decide. Do not fan out writers again on this plan.
