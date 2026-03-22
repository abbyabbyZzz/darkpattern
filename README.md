<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Subscription Trap — Escape the Dark Pattern

Pure static version (**HTML + CSS + vanilla JavaScript**), no Node.js / Vite / React required.

## Run Locally

- **Option 1 (quickest):** double-click `index.html`
- **Option 2 (recommended):** serve this folder with any static server (for example, VSCode Live Server)

## Project Structure

- `index.html` — **start screen** (mission intro, sound choice, Start game → trial offer modal)
- `home/index.html` — in-world “shop” homepage (Home / About / Pricing carousel)
- `css/styles.css` — styling (Win95 / pixel-inspired visual style)
- `main.js` — interactions (carousel, trial warning **10s after Claim benefits**; **24h countdown starts / resets each time the player closes the warning** (OK / X / backdrop / Esc), modals, expandable menus, background music)
- `assets/bg-music.mp3` — looping background music (place your MP3 here if missing)
- `assets/sfx-shake.mp3` — wrong-option screen shake sound (from `cncl03.mp3`)
- `assets/email-promo-notify.mp3` — spam-mail toast SFX (from `musmus_btn_set/btn06.mp3`)
- `assets/email-promo-icon.svg` — mail icon for promo toasts (from `email.svg`)
- `my-page/` — account page
- `subscription/` — subscription countdown
- `manage-subscription/` — plan management
- `cancel-plan/` — cancel flow + modals
- `cancelled/` — confirmation placeholder
- `customer-support/` — FAQ + contact form
- `feedback/` — feedback placeholder
