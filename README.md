# ALFA SECTOR — 3v3 Tactical FPS Prototype

A browser-playable 3v3 tactical first-person shooter built with **Three.js**, **Web Audio API**, and **TypeScript/React**. Inspired by classic round-based tactical shooters with an economy buy phase, 3-lane competitive European capital maps (**Lisbon — Alfama Miradouro** & **Moscow — Kitay-Gorod Plaza**), 6 original military operatives with 3 uniform skins each, and AI bots with Easy/Normal/Hard behavior.

## How to Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in any modern desktop browser with WebGL2 support. For production build:

```bash
npm run build
npm run preview
```

## Controls (Rebindable in Settings)

- **Move:** `W` `A` `S` `D`
- **Aim / Look:** Mouse (click viewport to lock pointer)
- **Shoot / Melee Slash:** Left Click (`LMB`)
- **Sniper Scope Zoom:** Right Click (`RMB`)
- **Reload:** `R`
- **Switch Weapons:** `1` (Primary), `2` (Pistol), `3` (Knife), or Mouse Wheel
- **Walk (Quiet / Accurate):** Hold `Shift`
- **Crouch:** Hold `Ctrl` (or `C`)
- **Jump:** `Space`
- **Buy Menu (Freeze Phase):** `B` (or press `F` to skip freeze timer)
- **Scoreboard:** Hold `Tab`
- **Pause Menu:** `Esc`

## Project Structure

- `src/game/types.ts` — Core interfaces for weapons, characters, maps, AI, HUD, and settings.
- `src/game/textures.ts` — Procedural `CanvasTexture` generators (azulejo tiles, cobblestones, plaster, concrete, red brick, wood crates, corrugated metal).
- `src/game/audio.ts` — Procedural Web Audio synthesizer (gunshots, footsteps, reload clicks, hitmarkers, round cues, ambient wind).
- `src/game/weapons.ts` — Weapon catalog (Knife, P9 Pistol, MP-74 SMG, M890 Shotgun, Vektor-47 AR, L115 Sniper), weapon skins, and 3D viewmodel builders.
- `src/game/characters.ts` — 2 factions (Vanguard Coalition & Iron Directorate), 6 operatives, 3 camo skins each, and multi-part 3D character rigs with head/body hitboxes.
- `src/game/map.ts` — Competitive 3-lane map builders for **Lisbon** and **Moscow** with AABB colliders, ramps, landmarks, lighting, fog, and AI waypoints.
- `src/game/ai.ts` — AI bot controller (economy buying, waypoint lane navigation, LOS raycasting, difficulty-scaled reaction time & accuracy).
- `src/game/game.ts` — Three.js `GameEngine` loop, FPS physics, hitscan shooting, pooled tracers/sparks, and 3v3 round/match state machine.
- `src/game/main.ts` — Settings persistence and keybinding helpers.
- `src/ui/` — `MainMenu.tsx`, `HudOverlay.tsx`, `CrosshairAndEffects.tsx`, `BuyMenu.tsx`, `ScoreboardModal.tsx`.

## How to Extend

### Adding a New Weapon
1. Add the weapon ID to `WeaponId` in `src/game/types.ts`.
2. Add its stats (damage, fireRate, recoilPattern, spread, reloadTime, price, etc.) to `WEAPONS` and `BUYABLE_WEAPONS` in `src/game/weapons.ts`.
3. Add a procedural viewmodel branch inside `buildWeaponViewModel()` in `src/game/weapons.ts`.

### Adding New Character or Weapon Skins
- **Weapon Skin:** Add an entry to `WeaponSkinId` in `src/game/types.ts` and `WEAPON_SKINS` in `src/game/weapons.ts`.
- **Character / Uniform Skin:** Add a new operative or extend `skins` inside `CHARACTERS` in `src/game/characters.ts`.

### Adding a New Map
1. Add the map ID to `MapId` in `src/game/types.ts`.
2. Add a branch in `buildMap()` in `src/game/map.ts` defining `addSolidBox` cover, `addRamp` elevation, `spawns` (`vanguard` & `directorate`), and `waypoints` for bot navigation.
3. Add the map selector card in `src/ui/MainMenu.tsx`.
