# UI and UX Guidelines for Beautiful Extensions

When building browser extensions, space is limited, and user attention spans are short. A clean, beautiful UI is critical for a high-quality feel.

## 1. Principles

*   **Native Feel:** The extension should feel like a native part of the browser or the operating system. Use system fonts where possible (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto...`).
*   **Support Dark Mode:** Always implement dark mode using `@media (prefers-color-scheme: dark)`. If a user's system is dark, a blazing white popup is jarring.
*   **Spacing and Typography:** Use ample padding (e.g., 16px around the main container) and clear visual hierarchy.
*   **Interactivity:** Buttons and actionable items should have hover and active states (`transform: translateY(1px)` for clicks).

## 2. Popup Dimensions

*   **Width:** Keep popup widths fixed and predictable. Recommended widths: `320px`, `400px`, or max `800px` (Chrome's hard limit).
*   **Height:** Popups can grow based on content but shouldn't exceed `600px` in height to avoid ugly scrollbars inside the popup context.

## 3. Recommended Tech Stack

*   **Vanilla HTML/CSS/JS:** Ideal for small to medium popups. Fast load times, no bundlers needed. (See `assets/popup.html` and `popup.css`).
*   **React/Tailwind:** Use only for highly complex popups, options pages, or side panels. Be aware that bundlers increase complexity in Manifest V3 (Content Security Policies).

## 4. Visual Elements

*   **Colors:** Use a primary brand color and semantic colors for success/error/warning. Provide soft backgrounds (`#F9FAFB` light, `#111827` dark) for contrast against white/dark cards.
*   **Shadows:** Use subtle drop shadows on interactive elements (cards, primary buttons) to create depth.
*   **Icons:** Use inline SVG icons (like Lucide or Heroicons) rather than bulky icon fonts. They are scalable, styleable with CSS, and load instantly.