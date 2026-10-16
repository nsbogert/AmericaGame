# AMERICA: Everything Is Fine

A single-player 3D political puppet parody. Deliver three props, keep the cast from undoing your work, and get 16 clean seconds out of a 30-second live broadcast.

## Play

The private published game is at https://america-everything-is-fine.nbogert.chatgpt.site.

For local play, run `node build.mjs`, then `npm start`, and open http://127.0.0.1:8080/dist/. Three.js is vendored locally, and models and audio are served with the game. No account keys or remote inference are needed to play. A desktop browser with WebGL is recommended.

## Controls

- WASD / arrows: move. Clicking or tapping the floor also sets a walking destination.
- E: pick up, deliver, catch an animal, shoo Trump nearby, or use the highlighted station.
- Space: short dash, with a roughly three-second cooldown.
- Escape / P / Clipboard: pause.
- Expand: full-screen room; Exit fullscreen returns to the page.
- Mix audio: independent music, effects, and archival voice controls.

Match the colored props to their destinations. Vance may change an unfinished delivery's destination. Completed stations are vulnerable: Trump takes four seconds to undo one; roaming animals take five. Interrupt Trump, catch the animals or lure them out with bait, and recover loose props for free. The misrouted briefing must be carried from the desk to the service exit.

Once all three props are ready, GO LIVE starts the finale immediately. Keep the mic on to earn clean airtime, use applause or ribbon ceremonies to distract Trump, and clear the two urgent incidents before the shot ends. The shift also attempts to go live when only 30 seconds remain.

## Assets and source

`assets/models` contains delivery-sized textured GLBs; original Meshy exports are preserved in the parent project. `assets/audio` contains a Suno instrumental loop and Suno stamp, goose, and applause effects, plus small synthesized gameplay cues. `assets/audio/trump-clips/sources.json` documents four authentic 2020 White House speech excerpts. Game dialogue is invented parody and is not a transcript of those clips.

`sim.js` owns deterministic game rules, `renderer.js` the Three.js room and characters, `app.js` the interface and controls, and `audio.js` the audio mix. Run `npm test` for routed winning playthroughs and focused mechanics checks. `node build.mjs` refreshes the deployable `dist/` folder.

The main project documentation has the current gameplay notes, character production records, source attributions, and verification results. The original design PDF is the initial design baseline; later gameplay changes are recorded in `../docs/gameplay-v2.md`.
