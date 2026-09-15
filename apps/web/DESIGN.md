---
name: "Apple (HIG-inspired)"
colors:
# All hex values approximate, community-measured. Apple ships ADAPTIVE
# system colors (systemBlue etc.), not fixed hex. Design to the role names.
primary: "#007AFF"        # ~systemBlue (community-measured, not Apple-official)
label: "#000000"          # text role; adapts in dark mode
secondary_label: "#3C3C43"
background: "#FFFFFF"      # ~systemBackground; adapts in dark mode
success: "#34C759"        # ~systemGreen (approximate)
danger: "#FF3B30"         # ~systemRed (approximate)
roles: [systemBlue, label, secondaryLabel, systemBackground, systemGray..systemGray6]
typography:
font_family: "'SF Pro', system-ui, -apple-system, sans-serif"
mono: "'SF Mono', ui-monospace, monospace"
scale: { large_title: 34, title1: 28, title2: 22, title3: 20, headline: 17, body: 17, callout: 16, subhead: 15, footnote: 13, caption1: 12, caption2: 11 }
note: "Apple reference metrics (iOS, Large size). Dynamic Type rescales these."
layout:
spacing_convention: 8     # 8pt grid with 4pt subdivisions; convention, not an Apple mandate
min_tap_target: 44        # 44x44pt, Apple HIG rule
material:
liquid_glass: "translucent layer that floats above and gives way to content (2025)"
principles:
- "Clarity: legible, precise, easy to understand."
- "Deference: the UI serves the content, never competes with it."
- "Depth: layers and motion convey hierarchy."
---

## Overview
Calm, content-first product UI. Chrome recedes; content leads.

## Colors
Design to semantic roles (systemBlue, label, systemBackground), not raw hex,
so light/dark and contrast modes come for free.

## Typography
One system family, weight for hierarchy. 17pt body is the legibility floor.

## Layout
8pt-multiple spacing (convention), 44pt minimum tap targets.

## Components
Translucent Liquid Glass surfaces layered over content; SF Symbols icons that
match the type weight.

## Do's and Don'ts
- Do: reach for systemBlue as the single primary accent.
- Do: keep 44pt minimum tap targets.
- Don't: hardcode a "system color" hex as if Apple published it; it is adaptive.
- Don't: add a second display font; SF carries the hierarchy.
