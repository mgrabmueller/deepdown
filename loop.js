/* Deep Down - the game experiment.
 *
 * Copyright (c) 2015, Martin Grabmüller
 * All rights reserved.
 * See the file LICENSE for licensing information.
 *
 * This is the generic game loop, powered by
 * `requestAnimationFrame()'.
 */

/* The following functions require a `state' object that has at least
 * the following fields:

var state = {running: false,
	     redraw: true,
	     update: function(state) {...},
	     draw: function(state) {...},
	     ...};
 *
 */

function tick(state) {
    if (state.running) {
        requestAnimationFrame(function() { tick(state); });
	state.update(state);
        if (state.redraw) {
            state.redraw = false;
            state.draw(state);
        }
    }
}

function startLoop(state) {
    state.running = true;
    requestAnimationFrame(function() { tick(state); });
    
}

function stopLoop(state) {
    state.running = false;
}
