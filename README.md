<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Subscription Trap — Escape the Dark Pattern

Pure static version (**HTML + CSS + vanilla JavaScript**), no Node.js / Vite / React required.

## Run Locally

- **Option 1 (quickest):** open the project folder and double-click **`index.html`** (marketing landing page).
- **Option 2 (recommended):** serve the **project root** with any static server (e.g. VS Code Live Server) so paths like `game/index.html` resolve correctly.

## Project Structure

- **`index.html`** — marketing / course landing (383Structure-style: VT323 body, purple palette). **Play** → `game/index.html`.
- **`style.css`**, **`main.js`** — landing page only.
- **`bg.png`** — pixel street banner used in `.streetscape` (keep next to `index.html`).
- **`game/`** — full interactive experience:
  - `game/index.html` — start screen (mission intro, sound choice, Start → trial offer modal)
  - `game/home/index.html` — in-world shop homepage
  - `game/css/styles.css` — Win95 / pixel-inspired UI
  - `game/main.js` — carousel, modals, countdown, navigation (BAD END returns to root `../index.html`)
  - `game/assets/` — images, audio, icons
  - `game/my-page/`, `game/subscription/`, `game/manage-subscription/`, `game/cancel-plan/`, `game/cancelled/`, `game/customer-support/`, `game/feedback/`, `game/nyan-hub/`, etc.

### Scripts

- `game/copy-nyan-covers.ps1` — run **from the `game/` directory** (see comment at top of file).
