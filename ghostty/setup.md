# Ghostty theme links

Named themes are loaded from `~/.config/ghostty/themes/<name>` (no extension).

Run from the root of your dotfiles clone:

```bash
mkdir -p ~/.config/ghostty
ln -s "$PWD/ghostty/themes" ~/.config/ghostty/themes
```

Then set in the live Ghostty config:

```
theme = light:ricco-light,dark:ricco-dark
```

Reload the configuration (Ghostty → Reload Configuration).
