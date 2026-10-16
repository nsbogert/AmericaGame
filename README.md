# AMERICA — Everything Is Fine

A playable single-player fictional parody. Original procedural Canvas puppet art, no external assets, libraries, accounts, or services required.

## Launch

From `/Users/nbogert/Movies/Final/america-game/game`, run:

```sh
npm start
```

Open `http://localhost:8080/dist/` in a browser. A local HTTP server is required because the simulation uses JavaScript modules. The deployable site is `dist/`.

## Controls and objective

- WASD or arrows: move the staffer with the dark bun and teal jacket.
- Hold E near a labeled station: work. Progress is retained when you leave.
- Tab, P, Escape, or the Clipboard button: pause/resume and review tasks.
- Sound button: optional sound, muted by default.

Choose a five-minute first shift or three-minute demo at the start. Finish four guest groups, lights, podium, gold finish, and ribbon. Clear unresolved requests and escort the lunch delivery out, then hold E at GO LIVE for 20 seconds. Main jobs cost a total of $395 from a $600 budget; requests are free repairs. Completed preparations are never erased.

The first 20 seconds are preparation before the boss arrives. He notices a live microphone, unfinished gold, or ceremonial opportunity for five seconds, then physically walks to the station and inspects it for three seconds before issuing a request. Distractions interrupt noticing, approaching, or inspecting. At most two unresolved requests exist. Hold E at the orange exclamation to repair a request in four seconds. Ignored requests gradually reduce presidential patience. Use the applause machine to redirect him and hold him there for 20 seconds after arrival; its cooldown is 38 seconds. Once initially prepared, the ribbon is reusable for a 12-second distraction with a 28-second cooldown. The clock and patience can end a shift, with a clean replay from the result screen.

Once per shift, after four preparations or 70 seconds (and never during preparation), RFK Jr brings an invented wildlife lunch delivery. A raccoon wanders toward guests and a goose crosses the camera area. Hold E for three seconds at the central CATERING CRATE to lure both safely out, then allow five seconds for departure. While active, lunch drains patience slowly without undoing any preparation. Broadcasting requires the animals to have left.

## Files and validation

`sim.js` is the pure game simulation; `app.js` draws and controls it. `index.html` and `style.css` provide the interface. `dist/` contains identical deployment copies. After editing source, run `node build.mjs` to refresh `dist/`.

```sh
npm test
node --check app.js
```

Logic tests exercise a complete solo win and budget, pause, capped recoverable requests, attention redirection, and timeout. Additional checks cover the preparation phase, physical arrivals, interruptible tells, ribbon cooldown, critical request gating, and win precedence at the deadline. Wildlife checks cover one-time delivery, no preparation spawn, safe departure, preparation preservation, and broadcast gating. Browser and human playtesting are separate acceptance checks.

## Art and future models

The current renderer draws 2D procedural puppet characters. `assets/manifest.json` reserves future GLB slots but does not load or display GLB models. Meshy source models and art references elsewhere in the project must not be described as rendered game assets. A future 3D renderer can retain station IDs and simulation behavior.

No real news claims or real dialogue appear in gameplay. Every event and line is invented satire.
