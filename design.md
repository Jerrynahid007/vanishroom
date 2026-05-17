# VanishRoom – Deep Design Specification
## 1. Design Philosophy & Motion Principles
- **Ephemeral & Weightless:** Everything that appears feels transient.  
  Use fade‑ins, soft rises, and disappearances. No hard cuts.
- **Fire Glow Feedback:** Interactive elements respond with a subtle  
  orange glow, mimicking embers. No abrupt color changes—always a  
  `0.2s`–`0.3s` transition.
- **Breathing Timer:** The countdown timer is alive. It pulses gently  
  under 5 minutes, and glows red with a heartbeat animation under 1 min.
- **Ember Continuity:** The floating embers in the background react  
  to nothing—they are a constant, calming presence. However, they  
  slightly brighten and rise faster on the expired‑room overlay.
---
## 2. Ember Background (Precise Specification)
**Canvas behavior:**
- Fixed position, `z-index: -10`.
- Dimensions: `window.innerWidth` × `window.innerHeight`, updated on resize.
- Opacity of whole canvas: `0.9` to let the pure black background show through slightly.
**Particle properties:**
- **Count:** 80–100.
- **Size:** random between `1.5px` and `4px`.
- **Base color:** `rgba(255, 69, 0, 0.3)`.
- **On creation:** random x, y within canvas; random horizontal speed  
  `-0.2` to `+0.2` px/frame; vertical speed `0.4` to `0.9` px/frame.
- **Opacity:** random `0.15` to `0.5`.
- **Lifespan:** infinite; when a particle leaves the top, it re‑enters  
  at a random x at the bottom.
**Animation loop:**
- Use `requestAnimationFrame`.
- Clear canvas with `clearRect` each frame.
- Draw each particle as a blurred circle using `ctx.arc` +  
  `ctx.shadowBlur = 8` and `ctx.shadowColor = 'rgba(255, 69, 0, 0.4)'`  
  to give a soft, glowing ember effect.
**Special states:**
- Room expired: all particles accelerate `speed * 2`, opacity increases  
  to `0.6`–`0.9`, shadowBlur → `16`, color shifts to `rgba(255, 100, 0, 0.7)`.
- Loading/joining: new particles slowly gather from bottom center,  
  creating a “fire is being kindled” effect.
---
## 3. Global Component States
Every interactive element has defined states. Here are the universal rules:
| State      | Visual Treatment |
|------------|------------------|
| **Rest**   | Default colors, no glow. |
| **Hover**  | Scale 1.02, box‑shadow: `0 0 12px rgba(255,69,0,0.3)`, border-color → `fire-500`. Transition `0.2s ease`. |
| **Active/ Focus** | Outline: `2px solid #FF4500` (with `outline-offset: 2px`), no scale change. |
| **Disabled** | Opacity 0.5, grayscale(50%), cursor not-allowed. |
| **Loading** | Skeleton pulse animation (ash‑800 ↔ ash‑700) or a small spinner (a circle of orange dots rotating). |
| **Error** | Shake animation (translateX ±5px, 0.3s), then red border/text for 3 seconds. |
---
## 4. Screen‑by‑Screen Detailed Specifications
### 4.1 Home Page
**Layout (mobile: 375px, desktop: 1440px):**
- Vertical centering: `display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh;`
- Max content width: `360px` on mobile, `420px` on desktop.
**Typography:**
- App name: `font-size: 2.5rem` mobile / `3.5rem` desktop.  
  Font-weight: `800`. Letter-spacing: `-0.02em`.  
  A small flame SVG icon (16×16px) placed inline to the right of the name.
- Subtitle: `font-size: 1rem` / `1.2rem`. `color: ash‑400`. Margin-top: `8px`.
- Footer text: `font-size: 0.8rem`. Margin-top: `24px`. `ash‑600`.
**Cards (Create / Join):**
- Size: `width: 100%`, `height: 120px` mobile, `140px` desktop.
- Background: `ash-800`. Border: `1px solid ash‑700`. Border-radius: `16px`.
- Inside: icon (24px, `fire-500`) centered above text. Text: `1rem`, `ash‑200`.
- Gap between cards: `16px`.
- On mobile they stack; on desktop they sit side‑by‑side with `column-gap: 20px`.
**Hover animation:** transform `translateY(-4px)` + glow.
---
### 4.2 Create Room Modal
**Overlay:** `background: rgba(0,0,0,0.8)`. Backdrop filter: `blur(4px)`.
**Modal card:**
- Width: `320px` mobile, `380px` desktop.
- Padding: `24px`.
- Border-radius: `20px`.
- Background: `ash-800`.
**Room code display:**
- `font-size: 3rem` / `3.5rem`. Weight `900`.
- Text color: transparent; background: `linear-gradient(135deg, #FF4500, #FF8C00)`; `-webkit-background-clip: text`.
- Glow: `text-shadow: 0 0 12px rgba(255,69,0,0.5)`.
- Copy icon: positioned absolute right of the code. `fill: ash‑400`, hover `fill: fire‑500`. On click, icon briefly shows a checkmark (0.5s) before reverting.
**Enter Room button:** full width, `height: 48px`. Border-radius `12px`. Gradient `#FF4500` → `#FF8C00`. Text `1rem`, `white`, `font-weight: 600`.
**Timer note:** `font-size: 0.75rem`, `ash‑500`. Icon: small clock SVG.
**Entrance animation:** modal scales from `0.9` to `1` over `0.2s` with `ease-out`.
---
### 4.3 Join Room Modal
**Input field:**
- Height: `48px`. Background: `ash‑700`. Border: `1px solid ash‑600`. Border-radius: `12px`.
- Placeholder: `ash‑500`. On focus: border → `fire‑500`.
- Text: `1rem`, `white`.
- Error: border → `#FF3B30`; shake for `0.4s`; error message appears below in `red` `0.75rem`.
**Join button:** same style as Enter Room button but disabled state is `ash‑700` background, text `ash‑500`.
---
### 4.4 Chat Room Header
**Height:** `56px`. Fixed top, `z-index: 20`.
**Left section (room code):**
- Code text: `0.9rem`, `font-weight: 500`, `ash‑200`.
- Copy icon beside it (16px), same interaction as modal.
**Center: countdown timer:**
- `font-size: 1.1rem`, `font-weight: 700`, `font-variant-numeric: tabular-nums`.
- Normal state: color `fire‑500`, no extra effect.
- 5‑minute threshold (`time < 300s`): text color stays fire‑500, but a subtle pulse: scale `1` → `1.05` → `1` every 2 seconds.
- 1‑minute threshold (`time < 60s`): text color → `#FF3B30`, glow: `text-shadow: 0 0 10px rgba(255,59,48,0.7)`, pulse accelerates to every 1 second.
**Right (user count):**
- Green dot (8px, `#34C759`) + `ash‑200` text (`0.8rem`).
---
### 4.5 Warning Banner (5 min)
**Container:**
- Full width, fixed just below header (top: `56px`), `z-index: 25`.
- Background: `fire‑600` (dark orange), opacity `0.95`.
- Padding: `12px 16px`. Height: `44px`.
- Entrance: slide down from `-44px` to `0` over `0.3s ease-out`.
**Content:**
- Flame icon (16px) + text: `0.85rem`, `white`, `font-weight: 500`.
- Dismiss “✕” button right‑aligned, white, `0.9rem`, hover: scale 1.2.
- Auto‑dismiss after `10s` with a fade‑out (`opacity 0` over `0.5s`).
---
### 4.6 Warning Modal (1 min)
**Overlay:** `rgba(0,0,0,0.85)`, `backdrop-filter: blur(8px)`. `z-index: 30`.
**Modal card:**
- Width: `300px`. Padding: `24px`. Border-radius: `20px`.
- Background: `ash‑800`, border: `1px solid fire‑500`.
- Icon: large hourglass/fire SVG (48px), centered, with a slow rotation animation.
- Title: `1.25rem`, `red`, `font-weight: 700`, margin-top: `16px`.
- Body: `0.85rem`, `ash‑300`, margin-top: `8px`.
- Buttons stacked: **Create New Room** (primary gradient, full width, margin-top: `20px`) and **Stay** (secondary `ash‑700` background, `ash‑200` text, full width, margin-top: `8px`).
- **Can’t be dismissed** by clicking overlay.
---
### 4.7 Expired Room Overlay
**Overlay:** `rgba(0,0,0,0.9)`. `z-index: 40`.
**Content:**
- Large fire emoji (64px) with a “extinguished” animation: opacity fades in from 0, scale from 0.5 to 1.
- Text: *“This room has burned out.”* `1.5rem`, `ash‑400`.
- Countdown: *“Redirecting in 5…”* (5,4,3…), `ash‑500`. At 0, redirect to `/`.
- Button: **Create New Room** (primary) appears below countdown.
- Ember background brightens (as described earlier).
---
### 4.8 Message List & Bubbles
**List container:**
- `padding: 16px`. Overflow‑y: auto.
- Background: transparent (the canvas shows through). No distinct card.
**Bubble styling:**
- Max-width: `75%`. Padding: `10px 14px`. Border-radius: `16px`.
- Sent (self): background `#CC3700`, margin-left auto, border-bottom-right-radius `4px`.
- Received: background `#2A2A2A`, margin-right auto, border-bottom-left-radius `4px`.
- Text: `0.9rem`, line-height `1.4`.
- Timestamp: `0.7rem`, `ash‑600`, margin-top `2px`, right-aligned inside bubble (or just below).
- **Dot indicator:** 6px circle, `fire‑500` for sent, `ash‑600` for received, placed 8px from bubble edge.
- **Entrance animation:** fade‑in + slide‑up (translateY(10px) → 0) over `0.2s`.
**System messages:**
- Centered, italic, `ash‑500`, `0.8rem`. Padding: `4px 0`. No bubble.
**Message types:**
- **Emoji:** render as plain text at `1.5rem`.
- **GIF:** `<img>` with `border-radius: 12px`, max‑width `250px`. A small “GIF” badge on bottom‑right.
---
### 4.9 Message Input Bar
**Fixed bottom, height:** `60px`. Background `ash‑800`. Padding: `8px 12px`.
**Emoji button:** 40×40px, icon size 22px. Tap opens a dark‑themed emoji picker (like `emoji-mart` with custom dark styles). Picker slides up from bottom, `height: 300px`, `transition: transform 0.3s ease`.
**GIF button:** a pill with “GIF” text, `height: 32px`, padding `0 12px`, border `1px solid ash‑600`, border-radius `16px`. Tap opens a full‑screen dark overlay with a search bar (top) and grid of GIF results. Tapping a GIF sends its URL as a message.
**Text input:** flex‑grow, `height: 44px`, border-radius `22px`, background `ash‑700`, border `none`, padding `0 16px`, `font-size: 0.95rem`. Placeholder: *“Type a message…”*.
**Send button:** circle 44×44px, border-radius `50%`, background `ash‑700` when empty, gradient when text exists. Contains an upward arrow SVG (16px, white). Transition background `0.2s`.
---
### 4.10 Privacy Page
**Layout:** max‑width `680px`, centered, padding `40px 20px`.
**Headings:** `1.5rem`, `fire‑500`, margin-top `24px`.
**Body:** `1rem`, `ash‑300`, line-height `1.6`.
**Icons:** 24px, `fire‑600`, placed beside each heading.
**Back arrow:** fixed top‑left, 40×40px, ash‑500, hover fire‑500.
---
## 5. Responsive Breakpoints
- **Mobile:** 320–640px (single column, larger touch targets).
- **Tablet:** 641–1024px (cards can be two columns).
- **Desktop:** 1025px+ (max content width 1200px, centered).
All specs above adapt to these ranges; font sizes scale using a modular scale (e.g., `clamp()` in CSS).
---
## 6. Accessibility
- All interactive elements have a focus ring (orange `2px solid`).
- Color contrast ratios > 4.5:1 for text.
- Alt text for icons/GIFs (can be set in code).
- `aria-live` region on message list for new messages.
- Reduced motion: disable ember animation and fade transitions if user prefers `prefers-reduced-motion: reduce`.
---
## 7. Asset List (SVGs/Icons needed)
- Flame icon (for logo, warnings, empty state)
- Plus icon (create)
- Door/enter icon (join)
- Copy icon
- Check icon (copy feedback)
- Clock icon
- Hourglass icon (1 min modal)
- Send arrow icon
- Smiley (emoji)
- Lock icon
- Crossed‑out database icon
- Green dot
- “GIF” pill (text only, no icon needed)
All icons should be a single SVG sprite or inline‑SVG components for easy color changes via `fill="currentColor"`.
---
## 8. Implementation Order (for your developer handoff)
1. Ember Background component
2. Global CSS (tailwind config, base styles, focus, animations)
3. Home Page + Modals
4. Chat Room – Header + Timer
5. Warning Banner & Modal
6. Message List & Bubbles
7. Message Input + Emoji/GIF pickers
8. Expired Overlay
9. Privacy Page
10. Polish & accessibility