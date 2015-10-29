/* Deep Down - the game experiment.
 *
 * Copyright (c) 2015, Martin Grabmüller
 * All rights reserved.
 * See the file LICENSE for licensing information.
 */

/** Line segment intersection test.  Returns null when the lines
 * p0--p1 and p2--p3 do not intersect. Returns an object with
 * attributes x and y representing the intersection point when they do
 * intersect.
 *
 * From Keith Peters, Coding Math, Episode 34. Source code taken from
 * https://github.com/bit101/CodingMath/blob/master/episode34/shapes.js
*/
function segmentIntersect(p0, p1, p2, p3) {
    var A1 = p1.y - p0.y,
	B1 = p0.x - p1.x,
	C1 = A1 * p0.x + B1 * p0.y,
	A2 = p3.y - p2.y,
	B2 = p2.x - p3.x,
	C2 = A2 * p2.x + B2 * p2.y,
	denominator = A1 * B2 - A2 * B1;

    if(denominator == 0) {
	return null;
    }

    var intersectX = (B2 * C1 - B1 * C2) / denominator,
	intersectY = (A1 * C2 - A2 * C1) / denominator,
	rx0 = (intersectX - p0.x) / (p1.x - p0.x),
	ry0 = (intersectY - p0.y) / (p1.y - p0.y),
	rx1 = (intersectX - p2.x) / (p3.x - p2.x),
	ry1 = (intersectY - p2.y) / (p3.y - p2.y);

    if(((rx0 >= 0 && rx0 <= 1) || (ry0 >= 0 && ry0 <= 1)) &&
       ((rx1 >= 0 && rx1 <= 1) || (ry1 >= 0 && ry1 <= 1))) {
	var t = isNaN(rx0) ? (isNaN(ry0) ? (isNaN(rx1) ? ry1 : rx1) : ry0) : rx0;

	return {
	    x: intersectX,
	    y: intersectY,
	    t: t
	};
    } else {
	return null;
    }
}

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

/* Find the subsector that contains
 * the posision x/y.  Uses the BSP
 * tree, just like DOOM.  */
function findSubSector(state, x, y) {
    var nodeIdx = state.nodes.length - 1;
    while ((nodeIdx & 0x8000) == 0) {
	var node = state.nodes[nodeIdx];
	var l = {p1: {x: node.x, y: node.y},
		 p2: {x: node.x + node.dx, y: node.y + node.dy}
		};
	if (sideOfLine(l, x, y) > 0) {
	    nodeIdx = node.rightNodeOrSSector;
	} else {
	    nodeIdx = node.leftNodeOrSSector;
	}
    }
    return state.ssectors[nodeIdx & (~0x8000)];
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

    if (state.view.showCurrentSector) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
	var id = actor.subsector ? actor.subsector.id : -1;
	var secid = actor.subsector ? actor.subsector.sector.id : -1;
        ctx.fillText("" + id + '/' + secid + "@" + actor.height, actor.pos.x, actor.pos.y);
    }
}

/* Draw the current frame.  */
function draw(state) {
    state.stats.frameCount += 1;
    var now = Date.now();
    if (now - state.stats.lastFPSTimestamp > 2000) {
	state.stats.FPS = state.stats.frameCount * 1000 / (now - state.stats.lastFPSTimestamp);
	state.stats.frameCount = 0;
	state.stats.lastFPSTimestamp = now;
    }

    var player = state.player;
    var pAngle = player.angle,
	fov2 = player.fov / 2;
    while (pAngle > Math.PI) {
	pAngle -= Math.PI*2;
    }
    while (pAngle < -Math.PI) {
	pAngle += Math.PI*2;
    }
    player.angle = pAngle;
    for (var i = 0; i < state.monsters.length; i++) {
	var monster = state.monsters[i];


	var dx = monster.pos.x - player.pos.x,
	    dy = monster.pos.y - player.pos.y;
	var angleToMonster = Math.atan2(dy, dx);

	if (Math.abs(pAngle - angleToMonster) <= fov2) {
	    monster.distToPlayer = pDist(player.pos, monster.pos);
	    monster.angleToPlayer = angleToMonster - Math.PI;
	}

	monster.animationCyle += 1;
	monster.animationAngle = angleToMonster - Math.PI;
    }

    if (state.view.showThreeD) {
        drawThreeD(state);
    }
    if (state.view.showMap) {
        drawMap(state);
    }
}

function drawMap(state) {
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
	    if (sec === state.player.subsector.sector) {
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
		if (line.front.sector === state.player.subsector.sector) {
		    ctx.beginPath();
		    ctx.strokeStyle = 'blue';
		    ctx.moveTo(line.front.p1.x + line.front.delta.x/2, line.front.p1.y + line.front.delta.y/2);
		    ctx.lineTo(line.front.p1.x + line.front.delta.x/2 + line.front.normal.x*10, line.front.p1.y + line.front.delta.y/2 + line.front.normal.y*10);
		    ctx.stroke();
		}
		if (line.back !== null && line.back.sector === state.player.subsector.sector) {
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
	}
    }
    // Draw the monsters.
    for (var i = 0; i < state.monsters.length; i++) {
	var monster = state.monsters[i];
	drawActor(state, monster, 'rgb(240,0,100)');
    }

    // Draw the player.
    drawActor(state, player, 'rgb(128,200,0)');

    // ctx.strokeStyle = 'red';
    // ctx.lineWidth = 3;
    // for (i = player.subsector.segStart; i < player.subsector.segStart + player.subsector.segCount; i++) {
    // 	var seg = state.segs[i];
    // 	ctx.beginPath();
    // 	ctx.moveTo(seg.p1.x, seg.p1.y);
    // 	ctx.lineTo(seg.p2.x, seg.p2.y);
    // 	ctx.stroke();
    // }
    
    ctx.restore();

    // Draw FPS indicator after restoring, because we don't want it
    // transformed.
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText("FPS: " + state.stats.FPS.toFixed(1), 4, 16);
    ctx.fillText("TPS: " + state.stats.TPS.toFixed(1), 4, 32);
}

function drawThreeD(state) {
    var ctx = state.view.threeDctx;
    var player = state.player;
    var fov2 = state.player.fov / 2;

    ctx.clearRect(0, 0, state.view.threeDwidth, state.view.threeDheight);

    ctx.save();

    ctx.strokeStyle = 'black';
    ctx.strokeRect(0, 0, state.view.threeDwidth, state.view.threeDheight);

    var deltaAngle = state.player.fov / state.view.threeDwidth;

    state.view.fuel = state.view.fuelReserve;

    // For each column, schedule the rendering of the scene for this column.
    for (var column = 1, angle = -fov2; column < state.view.threeDwidth-1; column++, angle += deltaAngle) {
        var dx = Math.cos(player.angle + angle),
            dy = Math.sin(player.angle + angle),
            rayStart = player.pos,
            rayEnd = {x: player.pos.x + dx * player.viewRange, y: player.pos.y + dy * player.viewRange};
        scheduleColumn(state, state.player.subsector.sector, state.player.pos, rayStart, rayEnd,
		       column, angle, 0, state.view.threeDheight-1);
	if (state.fuel <= 0) {
	    break;
	}
    }

    processThreeDQueue(state);

    if (state.view.renderMonsters) {
	// state.view.monsterQueue.sort(function(a, b) {
	//      b.dist - a.dist;
	// });
	var horizon = state.view.threeDheight / 2;
	// Eye height of player.
	var eyeHeight = player.eyeLevel+player.height;
	for (i = 0; i < state.view.monsterQueue.length; i++) {
	    var coll = state.view.monsterQueue[i];
	    var m = coll.monster;

	    var mHeightFactor = 0.12*player.viewRange / coll.dist;

	    // Top and bottom of the monter.
	    var monsterTop = horizon + (mHeightFactor*(eyeHeight-(m.height + m.size))),
		monsterBot = horizon + (mHeightFactor*(eyeHeight-m.height));

	    if (monsterTop >= coll.windowBot || monsterBot <= coll.windowTop) {
		continue;
	    }
	    // Now we clip the monster slice to the window we are looking through.
	    var mTop = Math.max(monsterTop, coll.windowTop),
		mBot = Math.min(monsterBot, coll.windowBot);

	    // ctx.beginPath();
	    // ctx.strokeStyle = 'yellow';
	    // ctx.moveTo(coll.column+0.5, mTop-0.5);
	    // ctx.lineTo(coll.column+0.5, mBot+0.5);
	    // ctx.stroke();

	    var monsterSize = monsterBot - monsterTop;
	    var topRatio = (mTop - monsterTop) / monsterSize,
		botRatio = (mBot - monsterTop) / monsterSize,
		colRatio = coll.t;

	    var srcSprite = getSprite(state, m.spritePrefix + "A1");

	    ctx.drawImage(srcSprite.image,
			  srcSprite.width*colRatio, topRatio*srcSprite.height,
			  1, (botRatio-topRatio)*srcSprite.height,
			  coll.column, mTop,
			  1, mBot - mTop);
	}
    }
    state.view.monsterQueue = [];
}

function shadeGray(shade, lightLevel) {
    var g = (shade * (lightLevel / 255)) | 0;
    return 'rgb(' + g + ',' + g + ',' + g + ')';
}

function shadeAlpha(shade, lightLevel) {
    var g = (255-(shade * (lightLevel / 255)))/255;
    return 'rgba(0,0,0,' + g + ')';
}

function processThreeDQueue(state) {
    var player = state.player,
        ctx = state.view.threeDctx;

    var horizon = state.view.threeDheight / 2;
    // Eye height of player.
    var eyeHeight = player.eyeLevel+player.height;

    var lastLine = -1;
    var i;

    while (state.view.queueIn !== state.view.queueOut && state.view.fuel >= 0) {
	state.view.fuel -= 1;
        var coll = state.view.queue[state.view.queueOut];
        state.view.queueOut = (state.view.queueOut + 1) % state.view.queue.length;

        // Determine color based on distance.
        var distShade = 255 - ((coll.dist * 255 / player.viewRange) | 0);
        var shade = shadeGray(distShade, coll.sector.lightLevel);
        var alpha = shadeAlpha(distShade, coll.sector.lightLevel);

        // Determine the relative size of this wall fragment.
	var heightFactor = 0.12*player.viewRange / coll.dist;

        // Top and bottom of the wall slice for the current column.
	var sectorTop = horizon + (heightFactor*(eyeHeight-coll.sector.ceiling)),
	    sectorBot = horizon + (heightFactor*(eyeHeight-coll.sector.floor));

        // Now we clip the wall slice to the window we are looking through.
        var colTop = Math.max(sectorTop, coll.windowTop),
            colBot = Math.min(sectorBot, coll.windowBot);
	if (colTop > colBot) {
	    continue;
	}

	var sectorSize = sectorBot - sectorTop;
	var topRatio = (colTop - sectorTop) / sectorSize,
	    botRatio = (colBot - sectorTop) / sectorSize,
	    colRatio = coll.t;

        // Draw ceiling.
        ctx.beginPath();
	ctx.strokeStyle = shadeGray(200, coll.sector.lightLevel);
        ctx.moveTo(coll.column, coll.windowTop);
        ctx.lineTo(coll.column, colTop);
        ctx.stroke();
        // Draw floor.
        ctx.beginPath();
	ctx.strokeStyle = shadeGray(180, coll.sector.lightLevel);
        ctx.moveTo(coll.column, colBot);
        ctx.lineTo(coll.column, coll.windowBot);
        ctx.stroke();

        if (coll.side.line.twosided) {
            var otherSide = coll.side.line.front === coll.side ? coll.side.line.back : coll.side.line.front,
                otherSector = otherSide.sector;

            // Determine top and bottom of the next sector.
            var otherSectorTop = horizon + (heightFactor * (eyeHeight - otherSector.ceiling)),
	        otherSectorBot = horizon + (heightFactor * (eyeHeight - otherSector.floor));

	    var middleTop = Math.max(coll.windowTop, Math.max(otherSectorTop, colTop)),
	        middleBot = Math.min(coll.windowBot, Math.min(otherSectorBot, colBot));

	    var middleTopRatio = (middleTop - sectorTop) / sectorSize,
		middleBotRatio = (middleBot - sectorTop) / sectorSize;

	    var topSize = coll.sector.ceiling - otherSector.ceiling,
		botSize = otherSector.floor - coll.sector.floor;

            if (colTop < middleTop && otherSector.ceiling < coll.sector.ceiling && coll.side.upper != "-") {
		var srcSprite = getTexture(state, coll.side.upper);
		if (srcSprite !== null) {
		    ctx.drawImage(srcSprite.image,
				  (coll.part + coll.side.xofs) % srcSprite.width, topRatio*srcSprite.height,
				  1, (Math.min(botRatio, middleTopRatio)-topRatio)*srcSprite.height,
				  coll.column, colTop,
				  1, Math.min(colBot, middleTop) - colTop);
		    ctx.beginPath();
		    ctx.strokeStyle = alpha;
		    ctx.moveTo(coll.column, colTop);
		    ctx.lineTo(coll.column, Math.min(colBot, middleTop));
		    ctx.stroke();
		} else {
		    ctx.beginPath();
		    ctx.strokeStyle = shade;
		    ctx.moveTo(coll.column, colTop);
		    ctx.lineTo(coll.column, Math.min(colBot, middleTop));
		    ctx.stroke();
		}
	    }

            if (middleTop < middleBot && coll.side.middle != "-") {
		var srcSprite = getTexture(state, coll.side.middle);
		if (srcSprite !== null) {
		    ctx.drawImage(srcSprite.image,
				  (coll.part + coll.side.xofs) % srcSprite.width, middleTopRatio*srcSprite.height,
				  1, (middleBotRatio-middleTopRatio)*srcSprite.height,
				  coll.column, middleTop,
				  1, middleBot - middleTop);
		    ctx.beginPath();
		    ctx.strokeStyle = alpha;
		    ctx.moveTo(coll.column, middleTop);
		    ctx.lineTo(coll.column, middleBot);
		    ctx.stroke();
		} else {
		    ctx.beginPath();
		    ctx.strokeStyle = shade;
		    ctx.moveTo(coll.column, middleTop);
		    ctx.lineTo(coll.column, middleBot);
		    ctx.stroke();
		}
            }
	    if( otherSector.floor > coll.sector.floor && coll.side.lower != "-") {
		var srcSprite = getTexture(state, coll.side.lower);
		if (srcSprite !== null) {
		    ctx.drawImage(srcSprite.image,
				  (coll.part + coll.side.xofs) % srcSprite.width, middleBotRatio*srcSprite.height,
				  1, (botRatio-middleBotRatio)*srcSprite.height,
				  coll.column, middleBot,
				  1, colBot - middleBot);
		    ctx.beginPath();
		    ctx.strokeStyle = alpha;
		    ctx.moveTo(coll.column, middleBot);
		    ctx.lineTo(coll.column, colBot);
		    ctx.stroke();
		} else {
		    ctx.beginPath();
		    ctx.strokeStyle = shade;
		    ctx.moveTo(coll.column, middleBot);
		    ctx.lineTo(coll.column, colBot);
		    ctx.stroke();
		}
	    }
	    if (otherSectorTop >= coll.windowBot || otherSectorBot <= coll.windowTop) {
	    } else {

		if (coll.side.middle == "-") {
                    scheduleColumn(state, otherSector, coll.startPos, coll.intersection, coll.rayEnd, coll.column, coll.angle, middleTop, middleBot);
		}
            }
        } else {
	    var srcSprite = getTexture(state, coll.side.middle);
	    if (srcSprite !== null) {
		ctx.drawImage(srcSprite.image,
			      (coll.part + coll.side.xofs) % srcSprite.width, (topRatio*(coll.sector.ceiling - coll.sector.floor) + coll.side.yofs) % srcSprite.height,
			      1, (botRatio-topRatio)*srcSprite.height,
			      coll.column, colTop,
			      1, colBot - colTop);
		ctx.beginPath();
		ctx.strokeStyle = alpha;
		ctx.moveTo(coll.column, colTop);
		ctx.lineTo(coll.column, colBot);
		ctx.stroke();
	    } else {
		ctx.beginPath();
		ctx.strokeStyle = shade;
		ctx.moveTo(coll.column, colTop);
		ctx.lineTo(coll.column, colBot);
		ctx.stroke();
	    }
	}
    }
    ctx.restore();

    if (!state.view.showMap) {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText("FPS: " + state.stats.FPS.toFixed(1), 4, 10);
        ctx.fillText("TPS: " + state.stats.TPS.toFixed(1), 4, 20);
    }
}

function scheduleColumn(state, sector, startPos, rayStart, rayEnd, column, angle, windowTop, windowBot) {
    if (windowTop > windowBot) {
        return;
    }

    var player = state.player,
        ctx = state.view.threeDctx;

    var collision = null;

    var dx = Math.cos(player.angle + angle),
        dy = Math.sin(player.angle + angle);
    var i;
    for (i = 0; i < sector.sides.length; i++) {
	var side = sector.sides[i];
        var dp = dotProd(dx, dy, side.normal.x, side.normal.y);
        if (dp < 0) {
            var intersection = segmentIntersect(rayStart, rayEnd, side.p1, side.p2);
            if (intersection != null) {
                var dist = pDist(intersection, startPos) * Math.cos(angle);
                if (collision === null || dist < collision.dist) {
		    var part = pDist(side.p1, intersection),
			t = part / pDist(side.p1, side.p2);
                    collision ={dist: dist,
				t: t,
				part: part,
                                intersection: intersection,
			        startPos: startPos,
			        rayStart: rayStart,
			        rayEnd: rayEnd,
                                side: side,
                                column: column,
                                angle: angle,
			        sector: sector,
			        windowTop: windowTop,
			        windowBot: windowBot};
                }
            }
        }
    }

    if (collision !== null) {
        if ((state.view.queueIn + 1) % state.view.queue.length !== state.view.queueOut) {
            state.view.queue[state.view.queueIn] = collision;
            state.view.queueIn = (state.view.queueIn + 1) % state.view.queue.length;
        } else {
            console.log("render queue overflow");
        }
    }

    if (collision !== null && state.view.renderMonsters) {
	for (i = 0; i < sector.monsters.length; i++) {
	    var m = sector.monsters[i];
	    var p3 = {x: m.pos.x + Math.cos(m.angleToPlayer - Math.PI/2) * m.radius,
		      y: m.pos.y + Math.sin(m.angleToPlayer - Math.PI/2) * m.radius},
		p4 = {x: m.pos.x + Math.cos(m.angleToPlayer + Math.PI/2) * m.radius,
		      y: m.pos.y + Math.sin(m.angleToPlayer + Math.PI/2) * m.radius};
	    var intersection = segmentIntersect(rayStart, rayEnd, p3, p4);
	    if (intersection) {
		var dist = pDist(startPos, intersection) * Math.cos(angle);
		if (dist < collision.dist) {
		    var t = pDist(p3, intersection) / pDist(p3, p4);
		    var collision = {sector: sector,
				     dist: dist,
				     column: column,
				     t: t,
				     windowTop: windowTop,
				     windowBot: windowBot,
				     monster: m};
		    state.view.monsterQueue.push(collision);
		}
	    }
	}
    }

}

function updateActorBbox(actor) {
    actor.bbox.l = actor.pos.x - actor.radius;
    actor.bbox.r = actor.pos.x + actor.radius;
    actor.bbox.t = actor.pos.y - actor.radius;
    actor.bbox.b = actor.pos.y + actor.radius;
}

function updateBboxes(state) {
    for (var i = 0; i < state.monsters.length; i++) {
	var monster = state.monsters[i];
	updateActorBbox(monster);
    }
    updateActorBbox(state.player);
}

function updatePlayer(state) {
    var vx = 0,
        vy = 0;

    var playerMoved = false;

    if (state.input.turnLeft) {
        state.player.angle -= state.player.turnSpeed;
    }
    if (state.input.turnRight) {
        state.player.angle += state.player.turnSpeed;
    }
    if (state.input.moveForward) {
        vx += Math.cos(state.player.angle) * state.player.moveAccel;
        vy += Math.sin(state.player.angle) * state.player.moveAccel;
        playerMoved = true;
    }
    if (state.input.moveBackward) {
        vx -= Math.cos(state.player.angle) * state.player.moveAccel;
        vy -= Math.sin(state.player.angle) * state.player.moveAccel;
        playerMoved = true;
    }
    if (state.input.strafeLeft) {
        vx += Math.cos(state.player.angle - Math.PI/2) * state.player.moveAccel;
        vy += Math.sin(state.player.angle - Math.PI/2) * state.player.moveAccel;
        playerMoved = true;
    }
    if (state.input.strafeRight) {
        vx += Math.cos(state.player.angle + Math.PI/2) * state.player.moveAccel;
        vy += Math.sin(state.player.angle + Math.PI/2) * state.player.moveAccel;
        playerMoved = true;
    }

    if (!playerMoved) {
        state.player.velocity -= state.player.moveDecel;
        if (state.player.velocity < 0.1) {
            state.player.velocity = 0;
        }
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

    if (state.player.subsector.sector != null) {
	if (state.player.height > state.player.subsector.sector.floor) {
            state.player.height -= state.player.ySpeed;
	    state.player.ySpeed += state.player.yAccel;
	} else if (state.player.height < state.player.subsector.sector.floor) {
            state.player.height = state.player.subsector.sector.floor;
	    state.player.ySpeed = 0;
	} else {
	    state.player.ySpeed = 0;
	}
    }
}

function updateMonsters(state) {
    var i;
    for (i = 0; i < state.monsters.length; i++) {
	var monster = state.monsters[i];

	monster.tick += 1;

	switch (monster.state) {
	case "thinking":
	    if (monster.tick > 100 || Math.random() < 0.01) {
		monster.state = "walking"
		monster.tick = 0;
		monster.angle += Math.random() * Math.PI/2 - Math.PI/2;
	    }
	    break;
	case "walking":
	    if (monster.tick > 150 || Math.random() < 0.005) {
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
        if (monster.subsector.sector != null && monster.height > monster.subsector.sector.floor) {
            monster.height -= monster.ySpeed;
	    monster.ySpeed += monster.yAccel;
        } else if (monster.subsector.sector != null && monster.height < monster.subsector.sector.floor) {
            monster.height = monster.subsector.sector.floor;
	    monster.ySpeed = 0;
        } else {
	    monster.ySpeed = 0;
	}
    }
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

function projectPointToLineExternal(p, line) {
    var ABx = line.delta.x;
    var ABy = line.delta.y;
    var ABSquared = dotProd(ABx, ABy, ABx, ABy);
    if (ABSquared == 0) {
        return null;
    } else {
        var Apx = p.x - line.p1.x;
        var Apy = p.y - line.p1.y;
        var t = dotProd(Apx, Apy, ABx, ABy) / ABSquared;

        return {
	    x: line.p1.x + t * ABx,
	    y: line.p1.y + t * ABy,
	    t: t
	};
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
    var MAX_ITERATIONS = 3;
    var changed = true,
        iterations = 0;
    var collisionDetected = false;

    while (changed && iterations < MAX_ITERATIONS) {
        changed = false;
        iterations += 1;        // Make sure we terminate, even for
                                // crazy maps.

	for (var i = 0; i < state.lines.length; i++) {
	    var line = state.lines[i];

	    var skip = false;
            if (bboxIntersect(line.bbox, {l: mob.bbox.l + dx,
                                          r: mob.bbox.r + dx,
                                          t: mob.bbox.t + dy,
                                          b: mob.bbox.b + dy})) {
                if (line.twosided) {
                    var oldSide = sideOfLine(line, mob.pos.x, mob.pos.y);
                    var newSide = sideOfLine(line, mob.pos.x + dx, mob.pos.y + dy);

                    if (newSide === 0 && oldSide === 0) {
			// We stepped on the line, but did not cross it.
                        skip = true;
                    }

                    var otherSide = newSide < 0 ? line.front : line.back;

                    var otherFloor = otherSide.sector.floor,
                        otherCeiling = otherSide.sector.ceiling;
		    if (otherFloor >= mob.height) {
			if (otherFloor - mob.height <= mob.stepHeight) {
			    skip = true;
			}
		    } else if (otherFloor < mob.height) {
			if (mob.height - otherFloor < mob.maxStepHeight) {
			    skip = true;
			}
		    }
		}

		if (!skip) {
                    var newPlayerPos = {x: mob.pos.x + dx, y: mob.pos.y + dy};
                    var projected = projectPointToLineExternal(newPlayerPos, line);
                    var projectedDist = pDist(newPlayerPos, projected);

                    if (projectedDist == 0) {
			console.log("!!! dx", dx, "dy", dy);
			return true;
                    }
                    if (projected.t >= 0 && projected.t <= 1 && projectedDist < mob.radius) {
                        var corrX = line.normal.x *  (mob.radius - projectedDist);
                        var corrY = line.normal.y *  (mob.radius - projectedDist);
			dx += corrX;
			dy += corrY;
			changed = true;
			collisionDetected = true;
		    }
		}
            }
        }
    }
    if (collideMob(state, mob, dx, dy)) {
	return true;
    }

    if (dx != 0 || dy != 0) {
	// var newX = mob.pos.x + dx,
	//     newY = mob.pos.y + dy;
	// var newPlayerPos = {x: newX, y: newY};
	// for (var i = 0; i < state.lines.length; i++) {
	//     var line = state.lines[i];

        //     var projected = projectPointToLine(newPlayerPos, line);

	//     if (line.twosided && projected.t >= 0 && projected.t <= 1 &&
	// 	bboxIntersect(line.bbox, {l: mob.bbox.l + dx,
        //                                   r: mob.bbox.r + dx,
        //                                   t: mob.bbox.t + dy,
        //                                   b: mob.bbox.b + dy})) {
        //         var oldSide = sideOfLine(line, mob.pos.x, mob.pos.y);
        //         var newSide = sideOfLine(line, newX, newY);

        //         if (oldSide != newSide && oldSide != 0) {
        //             var thisSide = newSide > 0 ? line.front : line.back;
	// 	    if (mob !== state.player && mob.subsector.sector) {
	// 		for (var n = 0; n < mob.subsector.sector.monsters.length; n++) {
	// 		    if (mob === mob.sector.monsters[n]) {
	// 			mob.sector.monsters.splice(n, 0);
	// 			break;
	// 		    }
	// 		}
	// 	    }
        //             mob.sector = thisSide.sector;
	// 	    if (mob !== state.player) {
	// 		mob.sector.monsters.push(mob);
	// 	    }
	//         }
        //     }
        // }
        mob.pos.x += dx;
        mob.pos.y += dy;
	var oldSubsector = mob.subsector;
	mob.subsector = findSubSector(state, mob.pos.x, mob.pos.y);
	if (mob.subsector !== oldSubsector) {
	    if (mob !== state.player) {
		for (var n = 0; n < oldSubsector.sector.monsters.length; n++) {
		    if (mob === oldSubsector.sector.monsters[n]) {
			oldSubsector.sector.monsters.splice(n, 0);
			break;
		    }
		}
	    }
	    if (mob !== state.player) {
		mob.subsector.sector.monsters.push(mob);
	    }
	}
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
	if (state.view.debug) {
	    state.view.renderMonsters = !state.view.renderMonsters;
	}
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
	if (state.view.debug) {
	    state.view.showThreeD = !state.view.showThreeD;
	}
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

function prepareSprite(ctx, sprite, xofs, yofs) {
    for (var x = 0; x < sprite.width; x++) {
	var y = 0;
	var col = sprite.columns[x];
	for (var p = 0; p < col.length; p++) {
	    var post = col[p];
	    var tx = x;
	    for (var i = 0; i < post.pixels.length; i++) {
		var ty = (post.top + i);
		var idx = post.pixels[i];
		var rgb = palettes[0][idx];
		ctx.fillStyle = 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
		ctx.fillRect(tx + xofs, ty + yofs, 1, 1);
	    }
	}
    }
}

function getSprite(state, spriteName) {
    if (!state.spriteMap[spriteName]) {
	console.log('loading sprite ' + spriteName);
	var sprite = state.rawSprites[spriteName];
	var cvs = document.createElement('canvas');
	cvs.width = sprite.width;
	cvs.height = sprite.height;
	var ctx = cvs.getContext('2d');
	prepareSprite(ctx, sprite, 0, 0);
	var spr = {image: cvs,
		   width: sprite.width,
		   height: sprite.height,
		   leftOffset: sprite.leftOffset,
		   topOffset: sprite.topOffset,
		   name: sprite.name};
	state.spriteMap[spriteName] = spr;
    }
    return state.spriteMap[spriteName];
}

function getTexture(state, textureName) {
    if (!state.textureMap[textureName]) {
	console.log('loading texture ' + textureName);
	var texture = state.rawTextures[textureName];
	var cvs = document.createElement('canvas');
	cvs.width = texture.width;
	cvs.height = texture.height;
	var ctx = cvs.getContext('2d');
	texture.patches.forEach(function(patch) {
	    var patchName = state.rawPnames[patch.pname];
	    console.log('loading patch ' + patchName);
	    var sprite = state.rawPatches[patchName];
	    prepareSprite(ctx, sprite, patch.xoffset, patch.yoffset);
	});
	var tex = {image: cvs,
		   width: texture.width,
		   height: texture.height,
		   leftOffset: 0,
		   topOffset: 0,
		   name: textureName};
	state.textureMap[textureName] = tex;
    }
    return state.textureMap[textureName];
}

function start() {
    console.log("init...");

    var doomMap = true;
    var width = 600;
    var height = 400;
    var threeDwidth = 320;
    var threeDheight = 200;
    var i;

    var giantNumber = 1000000000;
    var canvas = document.getElementById("main-canvas");
    canvas.width = width;
    canvas.height = height;

    var threeDcanvas = document.getElementById("three-d-canvas");
    threeDcanvas.width = threeDwidth;
    threeDcanvas.height = threeDheight;
    threeDcanvas.style.width = (threeDwidth * 2) + 'px';
    threeDcanvas.style.height = (threeDheight * 2) + 'px';

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
	var level = level_E1M1

        sectors = [];
        sides = [];
        lines = [];
	nodes = [];
	ssectors = [];
	segs = [];

        for (i = 0; i < level.sectors.length; i++) {
            var sectordef = level.sectors[i];
            var sector = {id: i,
                          floor: sectordef.floorHeight,
                          ceiling: sectordef.ceilingHeight,
                          floorTexture: sectordef.floorFlat,
                          ceilingTexture: sectordef.ceilingFlat,
                          lightLevel: sectordef.lightLevel,
			  sides: [],
			  monsters: [],
			  bbox: {l: giantNumber,
				 r: -giantNumber,
				 t: giantNumber,
				 b: -giantNumber}};
            sectors.push(sector);
        }
	console.log(sectors.length + " sectors");
        for (i = 0; i < level.sidedefs.length; i++) {
            var sidedef = level.sidedefs[i];
	    var sec = sectors[sidedef.sector];
            var side = {id: i,
                        sector: sec,
			xofs: sidedef.xofs,
			yofs: sidedef.yofs,
                        lower: sidedef.lowerTexture,
                        upper: sidedef.upperTexture,
                        middle: sidedef.middleTexture,
                        flags: sidedef.flags};
	    sec.sides.push(side);
            sides.push(side);
        }
	console.log(sides.length + " sides");

        var vertices = level.vertices;
        var minx = giantNumber,
	    maxx = -giantNumber,
	    miny = giantNumber,
	    maxy = -giantNumber;

	console.log(vertices.length + " vertices");
        for (i = 0; i < vertices.length; i++) {
            var p = vertices[i];
	    minx = Math.min(minx, p.x);
	    maxx = Math.max(maxx, p.x);
	    miny = Math.min(miny, p.y);
	    maxy = Math.max(maxy, p.y);
        }

        var shiftX = (minx + maxx) / 2,
	    shiftY = (miny + maxy) / 2;

        for (i = 0; i < level.linedefs.length; i++) {
	    var linedef = level.linedefs[i];
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
	console.log(lines.length + " lines");

        for (i = 0; i < level.nodes.length; i++) {
            var nodedef = level.nodes[i];
	    var node = {x: nodedef.x - shiftX,
			y: -nodedef.y - shiftY,
			dx: nodedef.dx,
			dy: -nodedef.dy,
			leftNodeOrSSector: nodedef.leftNodeOrSSector,
			rightNodeOrSSector: nodedef.rightNodeOrSSector};
	    nodes.push(node);
	}
	console.log(nodes.length + " nodes");
	
        for (i = 0; i < level.segs.length; i++) {
            var segdef = level.segs[i];
	    var side = segdef.direction == 0 ?
		lines[segdef.lineDef].front :
		lines[segdef.lineDef].back;
	    var seg = {p1: {x: vertices[segdef.start].x - shiftX,
			    y: -vertices[segdef.start].y - shiftY},
		       p2: {x: vertices[segdef.end].x - shiftX,
			    y: -vertices[segdef.end].y - shiftY},
		       line: lines[segdef.lineDef],
		       direction: segdef.direction,
		       side: side,
		       sector: side.sector
		      };
	    segs.push(seg);
	}
	console.log(segs.length + " segs");
	
        for (i = 0; i < level.ssectors.length; i++) {
            var ssectordef = level.ssectors[i];
	    var ssector = {id: i,
			   segCount: ssectordef.segCount,
			   segStart: ssectordef.segStart,
			   sector: segs[ssectordef.segStart].sector};
	    ssectors.push(ssector);
	}
	console.log(ssectors.length + " ssectors");
	
	/* Calculate bounding boxes for all sectors.  */
	sectors.forEach(function(sec) {
	    sec.sides.forEach(function(sid) {
		sec.bbox.l = Math.min(sec.bbox.l, Math.min(sid.line.p1.x, sid.line.p2.x));
		sec.bbox.r = Math.max(sec.bbox.r, Math.max(sid.line.p1.x, sid.line.p2.x));
		sec.bbox.t = Math.min(sec.bbox.t, Math.min(sid.line.p1.y, sid.line.p2.y));
		sec.bbox.b = Math.max(sec.bbox.b, Math.max(sid.line.p1.y, sid.line.p2.y));
	    });
	});

        for (i = 0; i < level.things.length; i++) {
	    var thing = level.things[i];
	    if (thing.type == "Player1StartPos") {
	        playerpos.x = thing.x - shiftX;
	        playerpos.y = -thing.y - shiftY;
	        playerangle = thing.angle*Math.PI/180;
	    } else if (thing.type == "Imp" || thing.type == "FormerHuman" || thing.type == "FormerHumanSergeant") {
		var pfx;
		switch (thing.type) {
		case "Imp":
		    pfx = "TROO";
		    break;
		case "FormerHuman":
		    pfx = "POSS";
		    break;
		case "FormerHumanSergeant":
		    pfx = "SPOS";
		    break;
		}
		if (monsters.length < 20) {
	            monsters.push({type: thing.type,
				   spritePrefix: pfx,
				   pos: {x: thing.x - shiftX,
					 y: -thing.y - shiftY},
				   radius: 16,
				   angle: thing.angle*Math.PI/180,
				   bbox: {},
				   tick: 0,
				   moveSpeed: 3,
				   yAccel: 2,
				   ySpeed: 0,
				   state: "thinking",
				   sector: null,
				   height: 0,
				   size: 56,
				   stepHeight: 24,
				   maxStepHeight: 48,
				   animationCyle: 0
				  });
		}
	    }
        }
	console.log(monsters.length + " monsters");

//	level_E1M1 = null;
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

    var queue = [];
    for (i = 0; i < threeDwidth + threeDwidth * monsters.length; i++) {
        queue.push(null);
    }
    var state = {
        running: true,
	update: updateState,
	draw: draw,
        processInput: processInput,
        view: {
            debug: false,
            canvas: canvas,
            ctx: canvas.getContext('2d'),
            threeDcanvas: threeDcanvas,
            threeDctx: threeDcanvas.getContext('2d'),
            width: width,
            height: height,
            threeDwidth: threeDwidth,
            threeDheight: threeDheight,
            scale: scale,
            offset: {x: width / 2, y: height / 2},
            relative: true,
	    showNormals: true,
	    showFov: false,
            showLineNumbers: false,
            showSideNumbers: false,
	    showBbox: false,
            showCurrentSector: true,
	    showLines: true,
	    showSectors: false,
	    renderMonsters: true,
            showThreeD: true,
            showMap: true,
            queueIn: 0,
            queueOut: 0,
            queue: queue,
	    monsterQueue: [],
	    fuel: 0,
	    fuelReserve: 4000
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
            moveDecel: 2,
	    yAccel: 2,
	    ySpeed: 0,
            fov: 80*Math.PI/180,
            viewRange: 2000,
	    bbox: {},
            sector: null,
            height: 0,
            size: 56,
            eyeLevel: 42,
            stepHeight: 24,
	    maxStepHeight: 48
        },
        lines: lines,
        sides: sides,
        sectors: sectors,
	nodes: nodes,
	ssectors: ssectors,
	segs: segs,
	monsters: monsters,
	rawSprites: sprites,
	rawPatches: patches,
	rawPnames: pnames,
	rawTextures: textures,
	spriteMap: {},
	textureMap: {},
	stats: {lastFPSTimestamp: Date.now()-1500,
		frameCount: 0,
		FPS: 0,
                lastTPSTimestamp: Date.now() - 1500,
		tics: 0,
                tickCount: 0,
                TPS: 0}
    };

    state.player.subsector = findSubSector(state, state.player.pos.x, state.player.pos.y);
    state.monsters.forEach(function(m) {
	m.subsector = findSubSector(state, m.pos.x, m.pos.y);
	if (m.subsector.sector) {
	    m.subsector.sector.monsters.push(m);
	}
    });

    document.addEventListener('keyup', function(e) { keyUpHandler(state, e); });
    document.addEventListener('keydown', function(e) { keyDownHandler(state, e);});

    console.log("init done");
    startLoop(state);
}
