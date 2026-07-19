---
"@whitehash/ui": minor
"@whitehash/docs": minor
---

Rework navigation: the project browser is now the home page, and wallet lookup is a
spotlight-style search dialog opened from the nav ("Search wallet") or a keyboard
shortcut (Cmd/Ctrl+K or "/"). Add a Dialog primitive to @whitehash/ui (Base UI Dialog:
focus trap, scroll lock, dismissal, animated backdrop/popup). The browse surface is kept
mounted across navigation so its filters, loaded projects, and scroll position survive
drilling into a project and back (with manual scroll restoration taking over from the
browser's).
