# Product decisions

## Purpose

Help someone capture a color, copy its value, and keep a small reusable palette without interrupting their work.

## Audience

People working with colors in websites, design references, and other screen content. This is a lightweight utility, not a full palette editor.

## Decisions reflected in the current implementation

| Decision | Reason |
| --- | --- |
| Open the palette by default; make auto-pick optional | Give access to saved colors without starting a selection every time |
| Close the popup before native picking | Let the user sample the screen area underneath the popup |
| Copy the chosen HEX automatically | Remove a repeated copy step from the main workflow |
| Show copy feedback beside HEX | Keep confirmation next to the value it describes |
| Reserve a plain status row below Save | Avoid layout shifts, floating overlays, and hidden controls |
| Show exactly five saved colors at once | Keep the popup compact; scroll only when another row exists |
| Remove the manual color chooser | Reduce competing controls and focus on sampling existing colors |
| Use hot pink `#FF0088` and a star on the primary action | Preserve the author's visual direction |

## Iteration and evidence

The author tested successive versions in Chrome and reported failures, including loss of user activation on repeated selections. Version 0.3.9 was confirmed working by the author; subsequent releases refined presentation. This repository contains the resulting 0.4.6 implementation.

This is qualitative development feedback. The repository does not claim store publication, adoption metrics, or a formal usability study. Historical ZIP versions from development are not represented as separate Git commits.

## Ownership and implementation

Maya Bachrach defined the product requirements, evaluated the interaction and visual design, and tested the extension. Implementation and documentation were developed with AI assistance.
