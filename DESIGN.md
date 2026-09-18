# Sheet Codes

The visual baseline is the deployed site at https://app.sheet-codes.workers.dev,
recovered on 18 September 2026. Keep its catalogue with three entry points:
Django, Docker and Redis. Their native dialogs expose 25 topic and glossary pages.

Preserve the purple home hero, centered catalogue, floating navigation, light and
dark themes, readable article column and collapsible table of contents. All three
guides use the same sequential section cards; glossary pages use reference cards. Redis retains
its red identity. The recovered tokens and responsive rules live in
`themes/coo/source/css/learning.css`.

Catalogue panels and card hover effects animate only opacity and transforms.
Use a dimmed backdrop without blur and pause the home decorations while a topic
panel is open, so the background does not compete with the active interaction.
Panels close on a backdrop click or Escape; keyboard focus cycles between the
topic links and returns to the opening card when the panel closes.

Content changes should keep the existing routes and topic boundaries. Introduce
concepts before using them, identify the execution context and explain observable
results. Examples illustrate the topic; learning does not depend on a downloaded
laboratory, a hidden fixture or an unexplained application.

Verify the three catalogue dialogs, keyboard navigation, search, theme switching,
code copying, local anchors and mobile overflow whenever the reading shell changes.
