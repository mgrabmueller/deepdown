/* Deep Down - the game experiment.
 *
 * Copyright (c) 2015, Martin Grabmüller
 * All rights reserved.
 * See the file LICENSE for licensing information.
 *
 * This is the generic game loop, powered by
 * `requestAnimationFrame()'.  It is based on the adaptive game loop
 * in Robert Nystrom, "Game Programming Patterns", see
 * http://gameprogrammingpatterns.com/game-loop.html for details.
 */

/* The following functions require a `state' object that has at least
 * the following fields:

var state = {running: false,
	     update: function(state) {...},
	     draw: function(state) {...},
             processInput: function(state) {...},
	     ...};
 * The loops adds several fields for internal bookkeeping:
 * loopPreviousTime
 * loopLag
 * MS_PER_UPDATE
 */

function tick(state) {
    if (state.running) {
        requestAnimationFrame(function() { tick(state); });
        var currentTime = Date.now();
        var elapsed = currentTime - state.loopPreviousTime;
        state.loopPreviousTime = currentTime;
        state.loopLag += elapsed;

        state.processInput(state);

        while (state.loopLag >= state.MS_PER_UPDATE)
        {
            state.update(state);
            state.loopLag -= state.MS_PER_UPDATE;
        }

        state.draw(state);
    }
}

function startLoop(state) {
    state.MS_PER_UPDATE = 1000/30;
    state.running = true;
    state.loopPreviousTime = Date.now();
    state.loopLag = 0;
    requestAnimationFrame(function() { tick(state); });
}

function stopLoop(state) {
    state.running = false;
}
