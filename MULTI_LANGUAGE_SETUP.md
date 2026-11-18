# Multi-language update

Added language selection for:
- English
- Tamil
- Hindi
- Telugu
- Kannada
- Malayalam

## Files changed
- `templates/index.html` — language dropdown
- `static/script.js` — remembers the selected language and sends it with chat requests
- `app.py` — tells the AI to answer in the selected language
- `static/style.css` — styling for the selector

Backup copies of modified files were also created with `.backup` extensions.

## Important
If your original `app.py` uses a custom API request format, check that the `language` field is included in the request body and that the selected language is added to the model's system prompt.
