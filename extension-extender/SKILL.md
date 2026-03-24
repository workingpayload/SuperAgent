---
name: extension-extender
description: Creates, fixes, and debugs browser extensions with efficiency and beautiful UI. Use when a user asks to build a Chrome/Firefox extension, create a browser extension popup, or debug extension manifest/scripts.
---

# Extension Extender

## Overview

The Extension Extender skill specializes in creating modern, secure (Manifest V3), and visually appealing browser extensions. It provides boilerplates for robust extension architecture and beautiful vanilla CSS UIs.

## Workflow

When asked to create or modify a browser extension, follow these steps:

### 1. Project Initialization

If the user wants a new extension or popup, use the provided boilerplate assets to give them a massive head start.

- **Manifest V3:** Use `assets/manifest.json` as the base. It includes modern defaults for service workers and action popups.
- **Beautiful UI:** Use the combination of `assets/popup.html`, `assets/popup.css`, and `assets/popup.js`. 
  - *Instruction:* Copy these files into the user's workspace using `write_file`.

### 2. Styling and UI (The "Beautiful UI" Mandate)

When modifying or creating new UI elements in the extension, you **must** adhere to the guidelines in `references/ui-guidelines.md`. Read this file if you need a refresher on building dark-mode compatible, native-feeling UIs.

### 3. Debugging & Fixing

When a user asks you to fix an extension:
1. **Check the Manifest:** Ensure it is Manifest V3. Check for correct `host_permissions` and `permissions`. Service workers must be registered under `"background": { "service_worker": "..." }`.
2. **Check Content Scripts:** Ensure they are properly injected via `content_scripts` in the manifest or programmatic injection (`chrome.scripting.executeScript`).
3. **Verify DOM Readiness:** When querying the DOM in a popup or content script, ensure it runs after the DOM is loaded (e.g., `document.addEventListener('DOMContentLoaded', ...)`).

## Resources

- **`assets/manifest.json`**: Standard Manifest V3 boilerplate.
- **`assets/popup.html`**: Semantic, accessible HTML structure for a popup.
- **`assets/popup.css`**: Beautiful, modern vanilla CSS with dark mode support.
- **`assets/popup.js`**: Boilerplate popup logic.
- **`references/ui-guidelines.md`**: Core principles for extension design.