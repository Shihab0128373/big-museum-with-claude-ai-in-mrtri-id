# What to test after each phase

Open the site in **two browsers/devices** (create a room, join with the link). Use a phone for at least the "mobile" items.
First deploy note: the first start migrates your photos once (6/6/6/6/5 over the five galleries). Check the server log for `re-laid out 29 photos`.

## Phase 1 — Museum (hall, galleries, lighting, signs)
- [ ] You spawn in the **Entrance Hall** facing a huge, very tall vaulted hall. Banner says "Museum · Entrance Hall". **No photos** in the entrance area.
- [ ] Walk the hall: banner changes (I · Memories, II · Adventures, III · Together on the north wall, IV · Moments west, V · Smiles east, VI · Our Art east-south, Art Studio west).
- [ ] All 29 photos are visible across galleries I–V; captions show on plaques; click/tap a photo → viewer opens and arrows only cycle that gallery.
- [ ] Each gallery has its own coloured wall + big sign; the directory board near the entrance lists them.
- [ ] Statues, columns, benches (E to sit), plants, rugs fill the free space; golden heart statue turns; floor strips glow.
- [ ] Spotlight cones on frames, window light beams with floating dust, soft mist near the floor, glowing chandeliers.
- [ ] **Photos** button: move a photo to another gallery / upload → appears in that gallery on both screens. A gallery holds 8 (Our Art: 6).
- [ ] Mobile: Settings → Graphics: *Low* removes mist/dust and should feel smooth; *High* adds mist. Watch for stutter in the entrance (many lights are fake, but check your phone).
- [ ] Exit door (south) still goes to the House; you arrive in the House unchanged.

## Phase 2 — Art together
- [ ] Walk to the easel (west side, banner "Art Studio") → prompt "Draw together on the easel" → E / ● opens the canvas.
- [ ] Player 1 draws → Player 2 (with the canvas open) sees strokes appear live. Try colours, custom colour, brush size, **Eraser**.
- [ ] **Undo** removes only *your own* last stroke (for both of you). **Clear** asks for confirmation and clears for both.
- [ ] Player 2 opens the canvas *later* → sees the existing drawing. Reload a tab → drawing is still there.
- [ ] The easel in the 3D room shows the drawing (updates ~2×/second).
- [ ] **Hang in museum** → toast, picture appears in gallery **VI · Our Art** with caption "Drawn together · date" for both players. It also shows in the Photos manager.
- [ ] Phone portrait + landscape: canvas stays large, toolbar reachable, finger drawing doesn't scroll the page. Text chat button still works while drawing.

## Phase 3 — Garden (bigger)
- [ ] Travel → Garden: spawn near the south gates (museum gate in the middle, home gate to the left). Walk north: paths, plaza fountain, pond, gazebo, forest, fireflies; hedge walls around the park.
- [ ] Gates take you to the Museum / House; the House's garden door still brings you to the garden spawn.
- [ ] Moving across the map: shadows follow you (no shimmering), no stutter on a phone (try Graphics Low).

## Phase 4 — Racing & vehicles
- [ ] Follow the path east ("Racing Area" banner) to the pit lane: 4 parked vehicles on glowing pads. E / ● at one → you sit in it. Joystick/WASD drive, Space/⤒ horn (partner hears it), E/● **Get out**.
- [ ] Both players drive at once and see each other's vehicles (steering wheels, wheel spin, leaning scooter). Same model by both → second player gets the alternate paint.
- [ ] Driving on grass is slower (Bouncer least), trees/benches block you; leaving vehicles makes them vanish back to the pit.
- [ ] **Race Control** booth: E → "Start a race". Partner sees "started a race — Join race" bar; joining (or waiting 12 s, or no partner in the garden) → both teleported to the grid, **3-2-1-GO**, frozen until GO.
- [ ] Drive through the glowing gates **in order** (the next gate shows a cyan curtain); lap timer, best lap, lap n/3, position (1st/2nd) and partner's lap show in the HUD. Cutting across the grass skips nothing: you must still pass every gate.
- [ ] Finish 3 laps → **winner screen** with times & best laps; **Rematch** waits for the partner (button text changes), then a new countdown.
- [ ] Leave the race (✕ in HUD, getting out, or travelling away) → counts as DNF; the other can still finish.
- [ ] Server validation: (dev) in the browser console `net.request('race-cp', {i:1,t:50,x:0,z:0})` is rejected ("not at the gate"/"too fast").

## Regression (must be unchanged)
- [ ] Text chat (Enter / Chat button, 6 msgs/8 s limit), room codes / invite link, third player rejected, reconnect/resume.
- [ ] Controls: WASD/shift/space/drag look/scroll zoom/E interact/1–5 gestures/V mute; mobile joystick + buttons.
- [ ] Characters look identical (avatar.js is untouched), walking/sitting/emotes/hug work.
- [ ] Voice connects as before.
