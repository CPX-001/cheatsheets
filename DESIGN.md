# Sheet Codes

The visual baseline is the deployed site at https://app.sheet-codes.workers.dev,
recovered on 18 September 2026. Keep its catalogue with three entry points:
Django, Docker and Redis. Django and Redis each expose `Base`. Docker exposes
`Base`, `Dockerfile` and `Docker Compose`, in that order, with the latter two as
focused follow-up guides. The catalogue and search expose five guides in three topics.
Single-option panels use a compact 320px preferred width; panels with more
options size to their cards within viewport bounds.
Hide empty catalogue categories so every visible group contains a guide.

Preserve the purple home hero, centered catalogue, floating navigation, light and
dark themes, readable article column and collapsible table of contents. All
guides use the same sequential section cards. Guide accents match their catalogue
cards: Django green, Docker blue and Redis red, in light and dark themes. Inline
code, links, active index entries and focus indicators share each guide's accent.
The runtime owner is `themes/coo/source/css/learning.css`: `--learn-accent`,
`--learn-tint` and `--learn-focus` define text, tinted backgrounds and focus rings.
Django uses light values `#047857`, `#d1fae5`, `#059669` and dark values `#6ee7b7`,
`#123a30`, `#34d399`, respectively. Docker inherits the blue defaults; Redis keeps
its existing red overrides.

Catalogue panels and card hover effects animate only opacity and transforms.
Use a dimmed backdrop without blur and pause the home decorations while a topic
panel is open, so the background does not compete with the active interaction.
Panels close on a backdrop click or Escape; keyboard focus cycles between the
topic links and returns to the opening card when the panel closes.

The reading index lists only the main section headings (H2) in every guide;
subheadings remain in the article. It tracks the section at the top of the visible article during
scrolling, anchor navigation and restored page positions. Account for the floating
header, keep one current link, and reveal that link within a long desktop index.
Passive scrolling must not change keyboard focus or the URL/history.

Keep the main routes `/django.html`, `/docker.html` and `/redis.html`. Each Base
is an independent, compact guide for readers who know basic Python and terminal
usage but are new to that technology. Aim for 15–20 minutes of reading, covering
fundamentals and a working implementation in a coherent sequence.

Introduce concepts before using them. Explain each new library object, method
and relevant parameter, where variables originate, which file or terminal is
used, and what result to expect. Use related, fully explained examples and a
formal public-course voice. Exclude exercises, downloadable laboratories,
personal references and advanced topic catalogues. Docker's additional guides
develop image construction and Compose configuration without expanding Base into
a reference manual. Further subtopics can be added when requested; do not publish
empty placeholders or separate glossaries.

Verify the three catalogue dialogs, keyboard navigation, search, theme switching,
code copying, local anchors and mobile overflow whenever the reading shell changes.
