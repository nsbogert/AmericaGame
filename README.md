# AMERICA: Everything Is Fine

A single-player 3D political puppet parody. Deliver three props, fix the teleprompter, flags and briefing cards, keep the cast from undoing your work, and get 16 clean seconds out of a 30-second live broadcast.

## Play

The private published game is at https://america-everything-is-fine.nbogert.chatgpt.site.

For local play, run `node build.mjs`, then `npm start`, and open http://127.0.0.1:8080/dist/. Three.js is vendored locally, and models and audio are served with the game. No account keys or remote inference are needed to play. A desktop browser with WebGL is recommended.

## Controls

- WASD / arrows: move. Clicking or tapping the floor also sets a walking destination.
- E: pick up, deliver, catch an animal, shoo Trump nearby, or use the highlighted station.
- Hold E (or the on-screen Interact button), stationary and empty-handed: work at the three room stations. Releasing preserves progress.
- Space: short dash, with a roughly three-second cooldown.
- Escape / P / Clipboard: pause.
- Expand: full-screen room; Exit fullscreen returns to the page.
- Mix audio: independent music, effects, and archival voice controls.
- Cast close-up & voice test: pauses the shift to inspect all five faces, try reactions and mouth shapes, and audition the sourced cast clips. Done or Escape restores the previous screen.

Match the colored props to their destinations. Vance may change an unfinished delivery's destination. Completed stations are vulnerable: Trump takes four seconds to undo one; roaming animals take five. Interrupt Trump, catch the animals or lure them out with bait, and recover loose props for free. The misrouted briefing must be carried from the desk to the service exit.

Once all three props and all three room jobs are ready, GO LIVE starts the finale immediately. Keep the mic on to earn clean airtime, use applause or ribbon ceremonies to distract Trump, and clear the two urgent incidents before the shot ends. The shift also attempts to go live when only 30 seconds remain.

## Assets and source

`assets/models` contains delivery-sized textured GLBs; original Meshy exports are preserved in the parent project. `assets/audio` contains a Suno instrumental loop and Suno stamp, goose, and applause effects, plus small synthesized gameplay cues. `assets/audio/trump-clips/sources.json` documents the original four authentic 2020 White House speech excerpts. Game dialogue is invented parody and is not a transcript of those clips.

`sim.js` owns deterministic game rules, `renderer.js` the Three.js room and characters, `app.js` the interface and controls, and `audio.js` the audio mix. Run `npm test` for routed winning playthroughs and focused mechanics checks. `node build.mjs` refreshes the deployable `dist/` folder.

The main project documentation has the current gameplay notes, character production records, source attributions, and verification results. The original design PDF is the initial design baseline; later gameplay changes are recorded in `../docs/gameplay-v2.md`.

## Expressive puppets

All five characters have runtime facial morphs, blinks and event-driven reactions. A close-up camera shows the same 3D actor beside the ballroom. Trump uses five stylized speech shapes timed to the actual recording, including its pauses. Mute, pause, stop and disabled voice close the speaking mouth. These are approximate puppet mouth shapes, not exact human lip reading.

The original GLBs retain their body rigs; `faces.js` creates facial controls at runtime. `lip-sync.js` samples the measured audio envelopes and authored shape timing. Run `node audio-tests.mjs` and `node face-tests.mjs` for audio lifecycle and real-model geometry checks.

## Cast voices and wildlife

There are 17 authentic recordings: 11 Trump, two RFK Jr., two Vance, and two Hegseth. Contextual variation and a short bounded introduction queue space them out without overlap. Each speaker drives their own model’s mouth and close-up. The recording credits page preserves quotes, original context, dates and sources.

The duck and raccoon use optimized textured GLBs in `assets/models/animals`, with procedural waddling and small head/tail motion. Original source exports are kept outside the game folder under the parent project’s `assets/animals`. Existing catching, escorting and sabotage rules are unchanged.

## Live-mic interruptions

Trump’s speech drives a bent-elbow accordion hand gesture as well as his mouth. The close-up eases out to include his hands. At the live microphone, he launches into a longer authentic, self-congratulatory excerpt. Turning his mic off mid-speech cuts the recording and produces a brief feedback whine; normal idle mic toggles do not. Applause and ribbon distractions also interrupt the speech.
