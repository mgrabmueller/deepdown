/* Deep Down - the game experiment.
 *
 * Copyright (c) 2015, Martin Grabmüller
 * All rights reserved.
 * See the file LICENSE for licensing information.
 */

/* Dot product between the vectors (x0,y0) and (x1,y1).  */
function dotProd(x0, y0, x1, y1) {
    return x0 * x1 + y0 * y1;
}

/* Length of a vector represented by an object with an x and y
 * field.  */
function vLength(p) {
    return Math.sqrt(p.x * p.x + p.y * p.y);
}

/* Check whether the bounding boxes `b1' and `b2' intersect.  */
function bboxIntersect(b1, b2) {
    return !(b1.r < b2.l || b1.l > b2.r || b1.b < b2.t || b1.t > b2.b);
}

/* Return whether the point (x,y) is inside the bounding box `b'.  */
function bboxContains(b, x, y) {
    return (x >= b.l && x <= b.r && y >= b.t && y <= b.b);
}

/* Distance between two points `p1' and `p2'.  */
function pDist(p1, p2) {
    var dx = p2.x - p1.x,
        dy = p2.y - p1.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/* Find the sector that contains point (x,y).  Return null if not
 * inside any sector. */
function findSector(state, x, y) {
    var foundSector = null,
	smallestArea = 1000000000000;
    state.sectors.forEach(function(sec) {
	if (bboxContains(sec.bbox, x, y)) {
	    var area = (sec.bbox.r - sec.bbox.l) * (sec.bbox.b - sec.bbox.t);
	    if (area < smallestArea) {
		var sideOf = sideOfLine(sec.sides[0], x, y);
		var i = 1;
		while (i < sec.sides.length && sideOfLine(sec.sides[1], x, y) == sideOf) {
		    i++;
		}
		if (i == sec.sides.length) {
		    smallestArea = area;
		    foundSector = sec;
		}
	    }
	}
    });
    return foundSector;
}

/* Draw a bounding box.  */
function drawBBox(state, bbox) {
    if (state.view.showBbox) {
	var ctx = state.view.ctx;
	ctx.strokeStyle = 'rgba(0,0,0,0.4)';
	ctx.strokeRect(bbox.l, bbox.t, bbox.r - bbox.l, bbox.b - bbox.t);
    }
}

/* Draw a representation of an actor, that is, player or monster.  */
function drawActor(state, actor, color) {
    var ctx = state.view.ctx;

    drawBBox(state, actor.bbox);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(actor.pos.x, actor.pos.y, actor.radius, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(actor.pos.x + Math.cos(actor.angle) * (actor.radius - 5),
               actor.pos.y + Math.sin(actor.angle) * (actor.radius - 5))
    ctx.lineTo(actor.pos.x + Math.cos(actor.angle) * (actor.radius + 5),
               actor.pos.y + Math.sin(actor.angle) * (actor.radius + 5));
    ctx.stroke();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(actor.pos.x + Math.cos(actor.moveAngle) * actor.velocity, actor.pos.y + Math.sin(actor.moveAngle) * actor.velocity, actor.radius, 0, 2*Math.PI);
    ctx.fill();
    if (actor.corrections.length > 0) {
	var cx = actor.pos.x + Math.cos(actor.moveAngle) * actor.velocity,
	    cy = actor.pos.y + Math.sin(actor.moveAngle) * actor.velocity;
	ctx.beginPath();
	ctx.strokeStyle = 'white';
	ctx.moveTo(cx, cy);
	actor.corrections.forEach(function(corr) {
	    cx += corr.x;
	    cy += corr.y;
	    ctx.lineTo(cx, cy);
	});
	ctx.stroke();
    }

    if (state.view.showCurrentSector) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
	var id = actor.sector === null ? -1 : actor.sector.id;
        ctx.fillText("" + id + "@" + actor.height, actor.pos.x, actor.pos.y);
    }
}

/* Draw the current frame.  */
function draw(state) {
    var i;
    var ctx = state.view.ctx;
    var player = state.player;

    // Clear previous frame.
    ctx.clearRect(0, 0, state.view.width, state.view.height);

    if (state.view.debug) {
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("DEBUG", state.view.width - 100, 30);
    }

    ctx.save();

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, state.view.width, state.view.height);

    // Translate, rotate and scale the view.
    ctx.translate(state.view.offset.x, state.view.offset.y);
    if (state.view.relative) {
        ctx.rotate(-player.angle - Math.PI/2);
        ctx.scale(state.view.scale, state.view.scale);
        ctx.translate(-player.pos.x, -player.pos.y);
    } else {
        ctx.scale(state.view.scale, state.view.scale);
    }

    // Show the field of view as a cone, centered on the player.
    if (state.view.showFov) {
	ctx.beginPath();
	ctx.strokeStyle = 'rgba(128,0,0,1)';
	var fov = player.fov/2;
	ctx.moveTo(player.pos.x + Math.cos(player.angle + fov) * player.radius,
		   player.pos.y + Math.sin(player.angle + fov) * player.radius);
	ctx.lineTo(player.pos.x + Math.cos(player.angle + fov) * (player.radius + player.viewRange),
		   player.pos.y + Math.sin(player.angle + fov) * (player.radius + player.viewRange));
	ctx.moveTo(player.pos.x + Math.cos(player.angle - fov) * player.radius,
		   player.pos.y + Math.sin(player.angle - fov) * player.radius);
	ctx.lineTo(player.pos.x + Math.cos(player.angle - fov) * (player.radius + player.viewRange),
		   player.pos.y + Math.sin(player.angle - fov) * (player.radius + player.viewRange));
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(player.pos.x, player.pos.y,
		player.radius + player.viewRange,
		player.angle - fov,
		player.angle + fov);
	ctx.stroke();
    }

    if (state.showSectors) {
	state.sectors.forEach(function(sec) {
	    drawBBox(state, sec.bbox);
	
            ctx.font = 'bold 10px sans-serif';
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText("sec " + sec.id,
			 (sec.bbox.l + sec.bbox.r) / 2,
			 (sec.bbox.t + sec.bbox.b) / 2);
	    if (sec === state.player.sector) {
		sec.sides.forEach(function(side) {
		    ctx.beginPath();
		    ctx.lineWidth = 2;
		    ctx.moveTo(side.p1.x, side.p1.y);
		    ctx.lineTo(side.p2.x, side.p2.y);
		    ctx.stroke();
		});
	    }
	});
    }
    ctx.lineWidth = 1;


    if (state.view.showLines) {
	// Render all walls.
	for (i = 0; i < state.lines.length; i++) {
            var line = state.lines[i];
            var dp = dotProd(Math.cos(player.angle),
                             Math.sin(player.angle),
                             line.normal.x,
                             line.normal.y);
            ctx.beginPath();
            if (line.checkColliding) {
		ctx.strokeStyle = 'rgba(255,0,0,1)';
            } else {
		if (dp < 0) {
                    ctx.strokeStyle = 'rgba(0,0,255,1)';
		} else if (dp > 0) {
                    ctx.strokeStyle = 'rgba(0,0,255,0.5)';
		} else {
                    ctx.strokeStyle = 'rgba(0,255,0,0.5)';
		}
            }
	    if (line.twosided) {
		ctx.strokeStyle = 'gray';
	    } else {
		ctx.strokeStyle = 'black';
	    }
            ctx.moveTo(line.p1.x, line.p1.y);
            ctx.lineTo(line.p2.x, line.p2.y);
	    if (false && state.view.showNormals) {
		ctx.moveTo(line.p1.x + line.delta.x/2, line.p1.y + line.delta.y/2);
		ctx.lineTo(line.p1.x + line.delta.x/2 + line.normal.x*10, line.p1.y + line.delta.y/2 + line.normal.y*10);
	    }
            ctx.stroke();
	    
	    if (state.view.showNormals) {
		if (line.front.sector === state.player.sector) {
		    ctx.beginPath();
		    ctx.strokeStyle = 'blue';
		    ctx.moveTo(line.front.p1.x + line.front.delta.x/2, line.front.p1.y + line.front.delta.y/2);
		    ctx.lineTo(line.front.p1.x + line.front.delta.x/2 + line.front.normal.x*10, line.front.p1.y + line.front.delta.y/2 + line.front.normal.y*10);
		    ctx.stroke();
		}
		if (line.back !== null && line.back.sector === state.player.sector) {
		    ctx.beginPath();
		    ctx.strokeStyle = 'red';
		    ctx.moveTo(line.back.p1.x + line.back.delta.x/2, line.back.p1.y + line.back.delta.y/2);
		    ctx.lineTo(line.back.p1.x + line.back.delta.x/2 + line.back.normal.x*10, line.back.p1.y + line.back.delta.y/2 + line.back.normal.y*10);
		    ctx.stroke();
		}
	    }
	    
	    drawBBox(state, line.bbox);
	    
            if (state.view.showLineNumbers) {
		ctx.font = 'bold 10px sans-serif';
		ctx.textBaseline = 'middle';
		ctx.textAlign = 'center';
		ctx.fillText("L " + line.id,
                             line.p1.x + 2*line.delta.x/3 + line.normal.x*10,
                             line.p1.y + 2*line.delta.y/3 + line.normal.y*10);
            }
            if (state.view.showSideNumbers) {
		ctx.font = '10px sans-serif';
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText("S " + line.front.id,
                             line.p1.x + line.delta.x/2 + line.normal.x*15,
                             line.p1.y + line.delta.y/2 + line.normal.y*15);
		if (line.twosided) {
                    ctx.fillText("S " + line.back.id,
				 line.p1.x + line.delta.x/2 - line.normal.x*15,
				 line.p1.y + line.delta.y/2 - line.normal.y*15);
		}
            }

            if (state.view.showProjected && line.projected) {
		if (line.projectedDist <= player.radius) {
                    ctx.fillStyle = 'red';
                    ctx.beginPath();
                    ctx.arc(line.projected.x, line.projected.y, 10, 0, 2*Math.PI);
                    ctx.fill();
            }
		ctx.beginPath();
		ctx.strokeStyle = 'red';
		ctx.arc(line.projected.x, line.projected.y, 10, 0, 2*Math.PI);
		ctx.stroke();
		
		ctx.beginPath();
		ctx.moveTo(player.pos.x, player.pos.y);
		ctx.lineTo(line.projected.x, line.projected.y);
		ctx.stroke();
            }
	}
    }
    // Draw the monsters.
    state.monsters.forEach(function(monster) {
	drawActor(state, monster, 'rgb(240,0,100)');
    });

    // Draw the player.
    drawActor(state, player, 'rgb(128,200,0)');

    ctx.restore();

    state.stats.frameCount += 1;
    var now = Date.now();
    if (now - state.stats.lastFPSTimestamp > 2000) {
	state.stats.FPS = state.stats.frameCount * 1000 / (now - state.stats.lastFPSTimestamp);
	state.stats.frameCount = 0;
	state.stats.lastFPSTimestamp = now;
    }

    // Draw FPS indicator after restoring, because we don't want it
    // transformed.
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("FPS: " + state.stats.FPS, 10, 20);
    ctx.fillText("TPS: " + state.stats.TPS, 10, 40);
}

function updateActorBbox(actor) {
    actor.bbox.l = actor.pos.x - actor.radius;
    actor.bbox.r = actor.pos.x + actor.radius;
    actor.bbox.t = actor.pos.y - actor.radius;
    actor.bbox.b = actor.pos.y + actor.radius;
}

function updateBboxes(state) {
    state.monsters.forEach(function(monster) {
	updateActorBbox(monster);
    });
    updateActorBbox(state.player);
}

function updateGeometry(state) {
    state.lines.forEach(function(line) {
        if (line.twosided) {
            line.blocking = false;
        } else {
            line.blocking = true;
        }
    });
}

function updatePlayer(state) {
    var vx = 0,
        vy = 0;

    state.player.velocity -= state.player.moveAccel/2;
    if (state.player.velocity < 0.1) {
        state.player.velocity = 0;
    }

    if (state.input.turnLeft) {
        state.player.angle -= state.player.turnSpeed;
    }
    if (state.input.turnRight) {
        state.player.angle += state.player.turnSpeed;
    }
    if (state.input.moveForward) {
        vx += Math.cos(state.player.angle) * state.player.moveAccel;
        vy += Math.sin(state.player.angle) * state.player.moveAccel;
    }
    if (state.input.moveBackward) {
        vx -= Math.cos(state.player.angle) * state.player.moveAccel;
        vy -= Math.sin(state.player.angle) * state.player.moveAccel;
    }
    if (state.input.strafeLeft) {
        vx += Math.cos(state.player.angle - Math.PI/2) * state.player.moveAccel;
        vy += Math.sin(state.player.angle - Math.PI/2) * state.player.moveAccel;
    }
    if (state.input.strafeRight) {
        vx += Math.cos(state.player.angle + Math.PI/2) * state.player.moveAccel;
        vy += Math.sin(state.player.angle + Math.PI/2) * state.player.moveAccel;
    }

    vx += Math.cos(state.player.moveAngle) * state.player.velocity;
    vy += Math.sin(state.player.moveAngle) * state.player.velocity;
    var moveAngle = Math.atan2(vy, vx),
        moveSpeed = Math.sqrt(vx * vx + vy * vy);
    var newMoveSpeed = moveSpeed > state.player.moveSpeed ? state.player.moveSpeed : moveSpeed;

    state.player.velocity = newMoveSpeed;
    state.player.moveAngle = moveAngle;

    vx = Math.cos(moveAngle) * newMoveSpeed;
    vy = Math.sin(moveAngle) * newMoveSpeed;

    if (vx != 0 || vy != 0) {
        collisionResolve(state, state.player, vx, vy);
    }

    if (state.player.sector != null) {
	if (state.player.height > state.player.sector.floor) {
            state.player.height -= 4;
	} else if (state.player.height < state.player.sector.floor) {
            state.player.height = state.player.sector.floor;
	}
    }
}

function updateMonsters(state) {
    var i;
    state.monsters.forEach(function(monster) {
	monster.tick += 1;

	switch (monster.state) {
	case "thinking":
	    if (monster.tick > 50 || Math.random() < 0.01) {
		monster.state = "walking"
		monster.tick = 0;
		monster.angle += Math.random() * Math.PI/2 - Math.PI/2;
	    }
	    break;
	case "walking":
	    if (monster.tick > 100 || Math.random() < 0.005) {
		monster.state = "thinking"
		monster.tick = 0;
	    } else {
		dx = Math.cos(monster.angle) * monster.moveSpeed;
		dy = Math.sin(monster.angle) * monster.moveSpeed;
		var coll = collisionResolve(state, monster, dx, dy);
		if (coll) {
		    monster.angle += Math.random()*Math.PI - Math.PI;
		}
	    }
	    break;
	}
        if (monster.sector != null && monster.height > monster.sector.floor) {
            monster.height -= 4;
        }
        if (monster.sector != null && monster.height < monster.sector.floor) {
            monster.height = monster.sector.floor;
        }
    });
}

function processViewInput(state) {
    if (state.input.zoomIn) {
        state.view.scale *= 1.1;
        if (state.view.scale > 10) {
            state.view.scale = 10;
        }
    }
    if (state.input.zoomOut) {
        state.view.scale /= 1.1;
        if (state.view.scale < 0.1) {
            state.view.scale = 0.1;
        }
    }
    if (state.input.panLeft) {
        state.view.offset.x += 10;
    }
    if (state.input.panRight) {
        state.view.offset.x -= 10;
    }
    if (state.input.panUp) {
        state.view.offset.y += 10;
    }
    if (state.input.panDown) {
        state.view.offset.y -= 10;
    }
}

function updateState(state) {
    // Maintain some statistics.
    
    // tickCount counts the invocations since we last updated the TPS
    // value.
    state.stats.tickCount += 1;
    // tics counts the total invocations since game start. 
    state.stats.tics += 1;
    var now = Date.now();
    if (now - state.stats.lastTPSTimestamp > 2000) {
	state.stats.TPS = state.stats.tickCount * 1000 / (now - state.stats.lastTPSTimestamp);
	state.stats.tickCount = 0;
	state.stats.lastTPSTimestamp = now;
    }

    updateGeometry(state);
    updatePlayer(state);
    updateMonsters(state);
    updateBboxes(state);
}

function processInput(state) {
    processViewInput(state);
}

function projectPointToLine(p, line) {
    var ABx = line.delta.x;
    var ABy = line.delta.y;
    var ABSquared = dotProd(ABx, ABy, ABx, ABy);
    if (ABSquared == 0) {
        return null;
    } else {
        var Apx = p.x - line.p1.x;
        var Apy = p.y - line.p1.y;
        var t = dotProd(Apx, Apy, ABx, ABy) / ABSquared;

	if (t < 0) {
	    return {x: line.p1.x,
		    y: line.p1.y,
		    t: t};
	} else if (t > 1) {
	    return {x: line.p2.x,
		    y: line.p2.y,
		    t: t};
	} else {
            return {
		x: line.p1.x + t * ABx,
		y: line.p1.y + t * ABy,
		t: t
	    };
        }
    }
}

/* Check for a collision between the player/monster `mob' and all
 * other players and monsters. If `mob' would collide with any other
 * player/monster when moving by (dx,dy), return true; otherwise
 * return false.  Currently, there is no collision resolution, only
 * detection.  */
function collideMob(state, mob, dx, dy) {
    var newPlayerPos = {x: mob.pos.x + dx,
                        y: mob.pos.y + dy};
    if (mob != state.player) {
	if (pDist(newPlayerPos, state.player.pos) < mob.radius + state.player.radius) {
	    return true;
	}
    }
    var i;
    for (i = 0; i < state.monsters.length; i++) {
	var monster = state.monsters[i];
	if (mob != monster) {
	    if (pDist(newPlayerPos, monster.pos) < mob.radius + monster.radius) {
		return true;
	    }
	}
    }
    return false;
}

/* Resolve a collision between player/monster `mob' and any
 * walls. Calculates an adjusted movement vector, starting with the
 * vector (dx,dy) and adjusting for all collisions with walls, so that
 * we get a nice "glide" effect.  Additionally, checks for collisions
 * with other players/monsters.  Moves `mob' by the resulting
 * vector. Returns true if there was any collision (player/monster or
 * wall), true otherwise.  Note: when colliding with a player/monster,
 * `mob' is not moved at all.  */
function collisionResolve(state, mob, dx, dy) {
    var changed = true,
        iterations = 1;
    var collisionDetected = false;

    if (mob === state.player) {
	state.lines.forEach(function(line) {

            var dp = dotProd(dx, dy, line.normal.x, line.normal.y);
            if (dp < 0) {
		// Player is moving towards the front of the line.
		line.checkColliding = true;

		var newPlayerPos = {x: mob.pos.x + dx,
                                    y: mob.pos.y + dy};
		line.projected = projectPointToLine(newPlayerPos, line);
		line.projectedDist = pDist(newPlayerPos, line.projected);

            } else {
		line.checkColliding = false;
		line.projectedDist = 0;
		line.projected = null;
            }
	});
    }

    mob.corrections = [];
    var oldX = mob.pos.x,
	oldY = mob.pos.y;
    while (changed && iterations > 0) {
        changed = false;
        iterations -= 1;        // Make sure we terminate, even for
                                // crazy maps.

	var newX = mob.pos.x + dx,
            newY = mob.pos.y + dy;

	state.lines.forEach(function(line) {

	    var skip = false;
            if (bboxIntersect(line.bbox, {l: mob.bbox.l + dx,
                                          r: mob.bbox.r + dx,
                                          t: mob.bbox.t + dy,
                                          b: mob.bbox.b + dy})) {
                if (line.twosided) {
                    var oldSide = sideOfLine(line, oldX, oldY);
                    var newSide = sideOfLine(line, newX, newY);

                    if (newSide === 0 && oldSide === 0) {
			// We stepped on the line, but did not cross it.
                        skip = true;
                    }
                    var otherSide = newSide < 0 ? line.front : line.back;

                    var otherFloor = otherSide.sector.floor,
                        otherCeiling = otherSide.sector.ceiling;
                    if (otherFloor - mob.height <= mob.stepHeight &&
                        otherCeiling > mob.height + mob.size) {
			// Actor fits through opening to next sector.
                        skip = true;
                    }
		}

		if (!skip) {
                    var newPlayerPos = {x: newX, y: newY};
                    var projected = projectPointToLine(newPlayerPos, line);
                    var projectedDist = pDist(newPlayerPos, projected);

                    if (projectedDist == 0) {
			console.log("!!! dx", dx, "dy", dy);
			return true;
                    }
                    if (projectedDist < mob.radius) {
			var correction = {x: newPlayerPos.x - projected.x,
					  y: newPlayerPos.y - projected.y};
			var corrLen = vLength(correction);
			var corrX = (correction.x / corrLen) * (mob.radius - projectedDist),
                            corrY = (correction.y / corrLen) * (mob.radius - projectedDist);
			mob.corrections.push({x: corrX, y: corrY});
			dx += corrX;
			dy += corrY;
			changed = true;
			collisionDetected = true;
                    }
		}
            }
        });
	oldX = newX;
	oldY = newY;
    }
    if (collideMob(state, mob, dx, dy)) {
	return true;
    }

    if (dx != 0 || dy != 0) {
	var newX = mob.pos.x + dx,
	    newY = mob.pos.y + dy;
	var newPlayerPos = {x: newX, y: newY};
	state.lines.forEach(function(line) {

            var projected = projectPointToLine(newPlayerPos, line);

	    if (line.twosided && projected.t >= 0 && projected.t <= 1 &&
		bboxIntersect(line.bbox, {l: mob.bbox.l + dx,
                                          r: mob.bbox.r + dx,
                                          t: mob.bbox.t + dy,
                                          b: mob.bbox.b + dy})) {
                var oldSide = sideOfLine(line, mob.pos.x, mob.pos.y);
                var newSide = sideOfLine(line, newX, newY);

                if (oldSide != newSide && oldSide != 0) {
                    var thisSide = newSide > 0 ? line.front : line.back;
                    mob.sector = thisSide.sector;
	        }
            }
        });
        mob.pos.x += dx;
        mob.pos.y += dy;
    }
    return collisionDetected;
}

function sideOfLine(line, x, y) {
    return Math.sign((line.p2.x - line.p1.x)*(y - line.p1.y) - (line.p2.y - line.p1.y)*(x - line.p1.x));
}

function keyDownHandler(state, e) {
    switch (e.which) {
    case 83: // S
    case 40: // down
        state.input.moveBackward = true;
	break;
    case 38: // up
    case 87: // W
        state.input.moveForward = true;
	break;
    case 65: // A
        state.input.strafeLeft = true;
        break;
    case 68: // D
        state.input.strafeRight = true;
        break;
    case 37: // left
        state.input.turnLeft = true;
	break;
    case 39: // right
        state.input.turnRight = true;
	break;
    case 78: // N
        state.input.zoomIn = true;
	break;
    case 77: // M
        state.input.zoomOut = true;
	break;
    case 74: // J
        state.input.panUp = true;
	break;
    case 75: // K
        state.input.panDown = true;
	break;
    case 72: // H
        state.input.panLeft = true;
	break;
    case 76: // L
        state.input.panRight = true;
	break;
    default:
	break;
    }
}

function keyUpHandler(state, e) {
    switch (e.which) {
    case 83: // S
    case 40: // down
        state.input.moveBackward = false;
	break;
    case 38: // up
    case 87: // W
        state.input.moveForward = false;
	break;
    case 65: // A
        state.input.strafeLeft = false;
        break;
    case 68: // D
        state.input.strafeRight = false;
        break;
    case 37: // left
        state.input.turnLeft = false;
	break;
    case 39: // right
        state.input.turnRight = false;
	break;
    case 78: // N
        state.input.zoomIn = false;
	break;
    case 77: // M
        state.input.zoomOut = false;
	break;
    case 74: // J
        state.input.panUp = false;
	break;
    case 75: // K
        state.input.panDown = false;
	break;
    case 72: // H
        state.input.panLeft = false;
	break;
    case 76: // L
        state.input.panRight = false;
	break;
    case 80: // P
        if (state.running) {
            stopLoop(state);
        } else {
	    startLoop(state);
        }
	break;
    case 88: // X
        state.view.debug = !state.view.debug;
	break;
    default:
	console.log('key up', e.which);
	break;
    }
}

function start() {
    var doomMap = true;
    var width = 800;
    var height = 600;
    var i;

    var giantNumber = 1000000000;
    var canvas = document.getElementById("main-canvas");
    canvas.width = width;
    canvas.height = height;

    var monsters = [];
    var playerpos = {x: 0, y: 0},
	playerangle = 0;

    var sectors = [
        {id: 0, floor: 0, ceiling: 23},
        {id: 1, floor: 3, ceiling: 20}
    ];
    var sides = [
        {id: 0, sector: sectors[0]},
        {id: 1, sector: sectors[0]},
        {id: 2, sector: sectors[0]},
        {id: 3, sector: sectors[0]},
        {id: 4, sector: sectors[0]},
        {id: 5, sector: sectors[0]},
        {id: 6, sector: sectors[0]},
        {id: 7, sector: sectors[0]},
    ];
    var p0 = {x: -300, y: -250},
        p1 = {x: 150, y: -300},
        p2 = {x: 300, y: 300},
        p3 = {x: -300, y: 300},
        p4 = {x: 300, y: 500},
        p5 = {x: -300, y: 500};
    var lines = [
        {id: 0, p1: p0, p2: p1, front: sides[0], back: null, twosided: false},
        {id: 1, p1: p1, p2: p2, front: sides[1], back: null, twosided: false},
        {id: 2, p1: p2, p2: p3, front: sides[2], back: sides[4], twosided: true},
        {id: 3, p1: p3, p2: p0, front: sides[3], back: null, twosided: false},
        {id: 4, p1: p2, p2: p4, front: sides[5], back: null, twosided: false},
        {id: 5, p1: p4, p2: p5, front: sides[6], back: null, twosided: false},
        {id: 6, p1: p5, p2: p3, front: sides[7], back: null, twosided: false}
    ];
    if (doomMap) {
        sectors = [];
        sides = [];
        lines = [];
	
        for (i = 0; i < level_E1M1.sectors.length; i++) {
            var sectordef = level_E1M1.sectors[i];
            var sector = {id: i,
                          floor: sectordef.floorHeight,
                          ceiling: sectordef.ceilingHeight,
			  sides: [],
			  bbox: {l: giantNumber,
				 r: -giantNumber,
				 t: giantNumber,
				 b: -giantNumber}};
            sectors.push(sector);
        }
        for (i = 0; i < level_E1M1.sidedefs.length; i++) {
            var sidedef = level_E1M1.sidedefs[i];
	    var sec = sectors[sidedef.sector];
            var side = {id: i,
                        sector: sec};
	    sec.sides.push(side);
            sides.push(side);
        }

        var vertices = level_E1M1.vertices;
        var minx = giantNumber,
	    maxx = -giantNumber,
	    miny = giantNumber,
	    maxy = -giantNumber;

        for (i = 0; i < vertices.length; i++) {
            var p = vertices[i];
	    minx = Math.min(minx, p.x);
	    maxx = Math.max(maxx, p.x);
	    miny = Math.min(miny, p.y);
	    maxy = Math.max(maxy, p.y);
        }

        var shiftX = (minx + maxx) / 2,
	    shiftY = (miny + maxy) / 2;

        for (i = 0; i < level_E1M1.linedefs.length; i++) {
	    var linedef = level_E1M1.linedefs[i];
	    var p1 = vertices[linedef.start],
		p2 = vertices[linedef.end];
            var rSide = sides[linedef.right],
                lSide = linedef.left !== null ? sides[linedef.left] : null;

	    var line = {id: i,
                        p1: {x: p1.x - shiftX, y: -p1.y - shiftY},
		        p2: {x: p2.x - shiftX, y: -p2.y - shiftY},
                        back: lSide,
                        front: rSide,
		        twosided: linedef.left !== null};
	    rSide.line = line;
	    rSide.p1 = line.p1;
	    rSide.p2 = line.p2;
	    if (lSide !== null) {
		lSide.line = line;
		lSide.p1 = line.p2;
		lSide.p2 = line.p1;
	    }
            lines.push(line);
        }

	/* Calculate bounding boxes for all sectors.  */
	sectors.forEach(function(sec) {
	    sec.sides.forEach(function(sid) {
		sec.bbox.l = Math.min(sec.bbox.l, Math.min(sid.line.p1.x, sid.line.p2.x));
		sec.bbox.r = Math.max(sec.bbox.r, Math.max(sid.line.p1.x, sid.line.p2.x));
		sec.bbox.t = Math.min(sec.bbox.t, Math.min(sid.line.p1.y, sid.line.p2.y));
		sec.bbox.b = Math.max(sec.bbox.b, Math.max(sid.line.p1.y, sid.line.p2.y));
	    });
	});

        for (i = 0; i < level_E1M1.things.length; i++) {
	    var thing = level_E1M1.things[i];
	    if (thing.type == "Player1StartPos") {
	        playerpos.x = thing.x - shiftX;
	        playerpos.y = -thing.y - shiftY;
	        playerangle = thing.angle*Math.PI/180;
	    } else if (thing.type == "Imp" || thing.type == "FormerHuman" || thing.type == "FormerHumanSergeant") {
	        monsters.push({type: thing.type,
			       pos: {x: thing.x - shiftX,
				     y: -thing.y - shiftY},
			       radius: 16,
			       angle: thing.angle*Math.PI/180,
			       bbox: {},
			       tick: 0,
			       moveSpeed: 5,
			       state: "thinking",
                               sector: null,
                               height: 0,
                               size: 56,
                               stepHeight: 24,
			       corrections: []
                              });
	    }
        }
    }

    /* Calculate some useful values per line. */
    for (i = 0; i < lines.length; i++) {
        var line = lines[i];

	var dx = line.p2.x - line.p1.x,
            dy = line.p2.y - line.p1.y,
            len = Math.sqrt(dx * dx + dy * dy),
            nx = -dy / len,
            ny = dx / len;
        line.normal = {x: nx, y: ny};
        line.len = len;
        line.delta = {x: dx, y: dy};
	line.bbox = {l: Math.min(line.p1.x, line.p2.x),
		     r: Math.max(line.p1.x, line.p2.x),
		     t: Math.min(line.p1.y, line.p2.y),
		     b: Math.max(line.p1.y, line.p2.y)};
    }

    sides.forEach(function(side) {
	var dx = side.p2.x - side.p1.x,
            dy = side.p2.y - side.p1.y,
            len = Math.sqrt(dx * dx + dy * dy),
            nx = -dy / len,
            ny = dx / len;
        side.normal = {x: nx, y: ny};
        side.len = len;
        side.delta = {x: dx, y: dy};
	side.bbox = {l: Math.min(side.p1.x, side.p2.x),
		     r: Math.max(side.p1.x, side.p2.x),
		     t: Math.min(side.p1.y, side.p2.y),
		     b: Math.max(side.p1.y, side.p2.y)};
    });
    
    var xscale = width / (maxx - minx),
        yscale = height / (maxy - miny);
    var scale = xscale < yscale ? xscale : yscale;

    var state = {
        running: true,
	update: updateState,
	draw: draw,
        processInput: processInput,
        view: {
            debug: false,
            canvas: canvas,
            ctx: canvas.getContext('2d'),
            width: width,
            height: height,
            scale: scale,
            offset: {x: width / 2, y: height / 2},
            relative: true,
	    showNormals: true,
	    showProjected: false,
	    showFov: false,
            showLineNumbers: false,
            showSideNumbers: false,
	    showBbox: false,
            showCurrentSector: true,
	    showLines: true,
	    showSectors: false,
        },
        input: {
            moveBackward: false,
            moveForward: false,
            strafeLeft: false,
            strafeRight: false,
            turnLeft: false,
            turnRight: false,
            zoomIn: false,
            zoomOut: false,
	    panLeft: false,
	    panRight: false,
	    panUp: false,
	    panDown: false
        },
        player: {
            pos: playerpos,
            angle: 3*Math.PI/2,
            radius: 16,
            turnSpeed: 0.05,
            moveSpeed: 15,
            velocity: 0,
            moveAngle: 0,
            moveAccel: 2,
            fov: 60*Math.PI/180,
            viewRange: 400,
	    bbox: {},
            sector: null,
            height: 0,
            size: 56,
            stepHeight: 24,
	    corrections: []
        },
        lines: lines,
        sides: sides,
        sectors: sectors,
	monsters: monsters,
	stats: {lastFPSTimestamp: Date.now()-1500,
		frameCount: 0,
		FPS: 0,
                lastTPSTimestamp: Date.now() - 1500,
		tics: 0,
                tickCount: 0,
                TPS: 0}
    };

    state.player.sector = findSector(state, state.player.pos.x, state.player.pos.y);
    state.monsters.forEach(function(m) {
	m.sector = findSector(state, m.pos.x, m.pos.y);
    });
				     
    document.addEventListener('keyup', function(e) { keyUpHandler(state, e); });
    document.addEventListener('keydown', function(e) { keyDownHandler(state, e);});

    startLoop(state);
}
