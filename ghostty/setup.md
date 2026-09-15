# Ghostty theme links

Named themes are loaded from `~/.config/ghostty/themes/<name>` (no extension).

```bash
mkdir -p /Users/rafaelricco/.config/ghostty
ln -s /Users/rafaelricco/Projects/personal/dotfiles/ghostty/themes /Users/rafaelricco/.config/ghostty/themes
```

Then set in the live Ghostty config:

```
theme = light:ricco-light,dark:ricco-dark
```

Reload the configuration (Ghostty → Reload Configuration).
