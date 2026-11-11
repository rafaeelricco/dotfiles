# Objects and prints (house pack)

The objects, the prints and the product-render builder are not built into this skill. They live in
the house pack, `<ui skill>/tastes/house/assets/objects/`, with their reference beside them:
`<ui skill>/tastes/house/references/effects-objects.md`. Read that file where another reference
cites `effects-objects.md`.

On a machine without the house pack there is no object or render: the product is shown in
photographs (`photos.md`).

A page that mounts one copies it by name, with the shared runtime its markup loads:

```bash
node <skill>/scripts/kit-copy.mjs --add objects/<id>,objects/_print-core/auto.js
```

A file the page still lacks is an `assets` FAIL in the gate; add it the same way.
