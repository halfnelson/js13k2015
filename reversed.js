/**
 * Created by David on 18/08/2015.
 */

function $s(selector) {
    return document.querySelectorAll(selector).item(0);
}


function $(id) {
    return document.getElementById(id);
}

function n$(tag) {
    return document.createElement(tag)
}


function game(readyCallback) {

    function collectFirst(arr, func) {
        var item=null;
        for (var i = 0; i < arr.length; i++) {
            item = func(arr[i],i);
            if (item) return item;
        }
    }

    var MapSection = function(cornerType, segmentCount, objects, hillType, isTunnel) {
        this.cornerType = cornerType;
        this.segmentCount = segmentCount;
        this.objects = objects;
        this.hillType = hillType;
        this.isTunnel = isTunnel;
    };

    MapSection.prototype.direction = function() {
        var d = this.cornerType;
        return d == 0 ? 0 : d/Math.abs(d);
    };

    MapSection.prototype.len = function() {
        return this.segmentCount*segmentLength;
    };

    var Map = function(sections) {
        this.sections = sections;
    };

    Map.prototype.sectionFromOffset = function(secIdx, off) {
        return  this.normalizeSection(secIdx, off).s;
    };

    Map.prototype.normalizeSection = function(secIdx, off) {
        while (true) {
            var s = this.sections[secIdx];
            if (off > s.len()) {
                off = off - s.len(); //track as offset into next section
                secIdx++;
                if (secIdx >= this.sections.length) {
                    secIdx = 0;
                }
            } else if (off < 0) {
                secIdx --;
                if (secIdx < 0 ) secIdx = this.sections.length-1;
                off =  this.sections[secIdx].len() + off;
            }  else {
                return {s: secIdx, o: off};
            }
        }
    };


    Map.objs = {
        signSlip : {id: 0, width: 0.5, bump: true},
        signWarn : {id: 1, width: 0.5, bump: true},
        tree: {id: 2, width: 0.15, bump: true},
        tunnelLight: {id: 3},
        checkpoint: {id: 4, width: 2},
        reverser: {id:5, width: 0.20, item: true},
        disabledItem: {id:6},
        boost: { id: 7, width: 0.125, item: true },
        startLine: {id: 8, width: 2}
    };

    Map.cornerTypes = {
        left: -2,
        right: 2,
        straight: 0
    };

    Map.hillTypes = {
        flat: 0,
        down: 0.005,
        up: -0.005
    };

    function BasicMap() {
        var o = Map.objs;
        var objectSet = [];
        function objectRepeat(type, offset, startDist, distBetween, count) {
            var r = [];
            for (var i=0; i < count; i++) {
                r.push([startDist+i*(distBetween),offset, type]);
            }
            return r;
        }

        objectSet = objectSet.concat(objectRepeat(o.signWarn, 1.25 , 0,segmentLength,5 ));
        objectSet = objectSet.concat(objectRepeat(o.signSlip, -1.25,segmentLength*15,segmentLength,5 ));
        //objectSet.push([segmentLength,0,o.checkpoint]);
       // objectSet.push([segmentLength/2,0,o.reverser]);
        var trees = objectRepeat(o.tree,2.0,0,segmentLength*2, 20);


        var checkpoint = [[segmentLength,0,o.checkpoint]];
        var startline =  [[segmentLength,0,o.startLine]];

        var tunnelLights = objectRepeat(o.tunnelLight,0,segmentLength/2,segmentLength,20);
        tunnelLights = tunnelLights.concat(objectRepeat(o.tunnelLight,-1,segmentLength/2,segmentLength,20));
        tunnelLights = tunnelLights.concat(objectRepeat(o.tunnelLight,1,segmentLength/2,segmentLength,20));

        var boosts = function(x,start,num) {
            return objectRepeat(o.boost,x,start*segmentLength,segmentLength,num);
        };
        //var startboosts = objectRepeat(o.boost, 0.75, 2*segmentLength, segmentLength,10);

        var h = Map.hillTypes;
        var c = Map.cornerTypes;
        return new Map([
            new MapSection(c.straight,20, objectSet.concat(boosts(0.75,2,10)).concat(startline), h.flat ,false),
            new MapSection(c.left,20, trees.concat(boosts(-0.25,5, 5)), h.down, false),
            new MapSection(c.straight,10, trees.concat(checkpoint), h.down, false),
            new MapSection(c.straight,20, tunnelLights.concat(boosts(-0.75,10, 5)) , h.flat, true),
            new MapSection(c.straight,10, trees, h.up, false),
            new MapSection(c.left,20,trees.concat(boosts(0,2, 5)).concat(checkpoint), h.flat,false),
            new MapSection(c.right,20,trees, h.up,false),
            new MapSection(c.straight,20, objectSet.concat(boosts(0.25,4,5)).concat(checkpoint), h.down, false),
            new MapSection(c.right, 20, objectSet, h.down,false)
        ]);
    }

    function Car(x,secIdx,zoff,color,acceleration,turnSpeed,maxSpeed) {
        return {
            x: x,
            secIdx: secIdx,
            zoff: zoff,
            color: color,
            acceleration: acceleration,
            turnSpeed: turnSpeed,
            maxSpeed: maxSpeed,
            direction: 0,
            speed: 0,
            lap: 0,
            reversed: false,
            accelerating: false,
            braking: false,
            isCar: true,
            lastCheckpointOffset: 0,
            lastCheckpointSection: 0
        }
    }


    function Renderer() {

        function cvs(width, height) {
            var cv = n$("canvas");
            cv.width = width;
            cv.height = height;
            return cv;
        }

        function poly(c, color, p) {
            c.fillStyle = color;
            c.beginPath();
            c.moveTo(p[0], h);
            c.lineTo(p[1], horizon);
            c.lineTo(p[2], horizon);
            c.lineTo(p[3], h);
            c.fill();
        }

//roadpos is -0.5 to +0.5 for left of road to right
        function drawline(c, color, roadpos, thickness) {
            var te = thickness * roadwidthend * tw;
            var t = thickness * roadwidth * tw;
            var r1 = tw / 2 + (roadpos * roadwidth * tw - t / 2);
            var r2 = tw / 2 + (roadpos * roadwidthend * tw - te / 2);
            var r3 = r2 + te;
            var r4 = r1 + t;
            poly(c, color, [r1, r2, r3, r4]);
        }

        function drawRoadTexture(grassColor, roadColor, sideRoadColor, lineColor, fog, callback) {
            var cv = cvs(tw,h);

            var c = cv.getContext("2d");

            //grass
            c.rect(0, 0, tw, h);
            c.fillStyle = grassColor;
            c.fill();

            //road
            drawline(c, roadColor, 0, 1);

            //lines
            drawline(c, sideRoadColor, 0.5, sideRoadWidth);
            drawline(c, sideRoadColor, -0.5, sideRoadWidth);
            drawline(c, lineColor, 0.25, lineWidth);
            drawline(c, lineColor, 0, lineWidth);
            drawline(c, lineColor, -0.25, lineWidth);

            if (callback)  callback(c);

            if (fog) {
                c.save();
                c.translate(0,h);
                c.scale(1,-1);
                c.drawImage(fog, 0, 0, w, horizon, 0, 0, tw, h/2);
                c.restore();
            }
            return cv;
        }

        function addRoadStripes(cv, color1, color2, stripeWidth) {
            var numofstripes = 1/stripeWidth;
            for (var i = 0; i < numofstripes; i++) {
                drawline(cv,i % 2 == 0 ? color1: color2,-0.5+stripeWidth* i,stripeWidth);
            }

        }


        function createTunnel(entry,darkness) {
            var tmpc = cvs(roadwidth*tw,h);

            var tc = tmpc.getContext("2d");

            tc.fillStyle = entry ? "#CCCCCC" :  "black";
            tc.fillRect(0,0,tmpc.width,darkness ? h : (h/3));
            return tmpc;
        }

        function createTunnelLight() {
            var size = 50;
            var tmpc = cvs(size, 2*h/3);
            var tc = tmpc.getContext("2d");
            tc.fillStyle="yellow";
            tc.beginPath();
            tc.arc(size/2,0,size/2,0, Math.PI);
            tc.fill();
            return tmpc;

        }

        function createSign(w, h, gh, color, borderColor, pollMargin, contentCallback ) {
            var tmpc = cvs(w,h+gh);
            var ctx = tmpc.getContext("2d");
            //poles
            ctx.fillStyle = "#DDD";
            ctx.fillRect(pollMargin*w-2,0,4,h+gh);
            ctx.fillRect((1-pollMargin)*w-2,0,4,h+gh);
            //sign
            ctx.fillStyle = borderColor;
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = color;
            ctx.fillRect(2,2,w-4,h-4);

            if (contentCallback) contentCallback(ctx);
            return tmpc;
        }

        function createUnicodeSign(w, h, gh, color, borderColor, chr, chrColor, pollMargin) {
            return createSign(w,h,gh,color,borderColor,pollMargin, function(ctx) {
                var fs = h * 0.85;
                ctx.font = fs+"px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = chrColor;
                ctx.fillText(chr, w/2,h/2,w);
            })
        }

        function createMask(img) {
            var tmpc = cvs(img.width, img.height);
            var tc = tmpc.getContext("2d");
            tc.drawImage(img,0,0,img.width,img.height, 0,0,img.width, img.height);

            tc.globalCompositeOperation = "source-atop";
            tc.fillStyle = "rgba(255,255,255,1.0)";
            tc.fillRect(0,0, tmpc.width, tmpc.height);
            return tmpc;
        }

        function createFog(startColor, finishColor, startOffsetPercent) {
            var tmpc = cvs(w,horizon);
            var tc = tmpc.getContext("2d");
            var gradientHeight = (1-startOffsetPercent)*horizon;
            var gradientTop = startOffsetPercent*horizon;
            var g = tc.createLinearGradient(0,gradientTop,0,gradientTop+gradientHeight);
            g.addColorStop(0, startColor);
            g.addColorStop(1, finishColor);
            tc.fillStyle = g;
            tc.fillRect(0,0,w,horizon);
            return tmpc;
        }

        function getFogSample(img) {
            var ct = img.getContext("2d");
            var fogdata = ct.getImageData(0,0,1,horizon);
            var fogalpha = [];
            for(var i = 0; i < horizon; i++ ) {
                fogalpha.push(fogdata.data[i*4+3]);
            }
            return fogalpha;
        }


        function createBackground(skycolor, groundcolor, fog) {
            var cv = cvs(tw,h);
            var c = cv.getContext("2d");


            c.fillStyle = skycolor;
            c.fillRect(0,0,tw,h);
            c.fillStyle=groundcolor;
            c.fillRect(0,h/2+5,tw,h/2);

            c.fillStyle = "white";

            var clds = [
                [(1/4)*tw, (1/6)*h, 0.35],
                [(2/4)*tw, (1/4)*h, 0.25],
                [(3/4)*tw, (1/5)*h,0.30],
                [(4/4)*tw, (1/8)*h, 0.20]
            ];
            for(var i=0; i < clds.length; i++) {
                c.font = h*clds[i][2]+"px Arial";
                c.fillText("\u2601",clds[i][0],clds[i][1]+30);
            }

            if (fog) {
                c.drawImage(fog, 0, 0, w, horizon, 0, 0, tw, h-horizon+5);
                c.drawImage(fog, 0, horizon-1,w,1,0,h/2+5,tw,h/2);
            }

            return cv;
        }

        function makeTransparent(image, opacity) {
            var tmpc = cvs(image.naturalWidth || image.width, image.naturalHeight || image.height );
            var tmpctx = tmpc.getContext("2d");
            tmpctx.globalAlpha = opacity;
            tmpctx.drawImage(image,0,0);
            return tmpc;

        }

        function flipImage(image) {
            var tmpc = cvs(image.naturalWidth || image.width, image.naturalHeight || image.height );
            var tmpctx = tmpc.getContext("2d");
            tmpctx.imageSmoothingEnabled = false;
            tmpctx.translate(image.width, 0);
            tmpctx.scale(-1, 1);
            tmpctx.drawImage(image, 0.5, 0);

            return tmpc;
        }

        function calcZMap(horizon) {
            var zmap = [];
            var cy =  50; //world camera height
            var cz = 8; //world camera distance from screen

            for (var y = horizon; y > 0; y--) {
                zmap.push((cy * cz) / y);
            }
            return zmap;
        }




        /*function drawUnicode(char, fw, fh, color, strokeColor, lineWidth) {
            var cv = n$("canvas");
            cv.width = fw;
            cv.height = fh;
            var c = cv.getContext("2d");
            c.fillStyle = color;
            c.strokeStyle = strokeColor;
            c.textAlign = "center";
            c.font = fh * 0.85 +"px Arial";
            c.lineWidth = lineWidth;
            c.fillText(char,fw/2,fh,fw);

            c.strokeText(char,fw/2,fh,fw);
            return cv;
        }*/


        function createItem(char, w, h,  fontColor) {

            var cv = cvs(w,h);
            var c = cv.getContext("2d");


            c.beginPath();
            c.fillStyle = fontColor;
            c.font = "normal normal bold "+h * 0.75 +"px Arial";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.shadowColor = "rgba(40,40,40,0.8)";
            c.shadowOffsetX = 4;
            c.shadowOffsetY = 4;
            c.fillText(char,w/2,h/2,w);


            return cv;


        }

        function drawBackground() {
            //left offset
            var bo = (backgroundoffset < 0) ? tw+backgroundoffset : backgroundoffset;
            var w1 = Math.min(w, tw-bo);
            c.drawImage(background, bo,0,w1,h,0,0,w1,h);

            //did we not cover whole background
            if (w1 < w) {
                c.drawImage(background, 0,0,w-w1,h,w1,0,w-w1,h);
            }
        }

        function renderObj(obj,x,y,z,scale,sy) {
            return {
                obj: obj,
                s: scale,
                x: x,
                y: y,
                z: z,
                sy: sy
            }
        }

        function draw3dRoad(camsec,camoff,camx) {



            var zoffset = camoff;// player.zoff;
            var currentSec =camsec;//  player.secIdx;
            var yoff = 0;
            var xoff = 0;
            var zoff = 0;
            var lastdx = 0;
            var dx = 0;
            var lastSec = currentMap.sections[currentSec];
            var lastx = 0;
            var lastz = -1;
            var objects = [];
            //road pass
            //slope
            var ddy = 0.005;  //up = dy = 1, ddy = 0.005
            var dy = 1;

            var playerScreenx = camx * -1 * ((roadwidth/2)*tw);

            var lasty = 0;
            var rendery = 0;
            var lastyz = 0;
            var x=0;
            var isTunnelEntry = false;
            var isTunnelExit = false;
            var hasTunnelExit = false;
            var theTunnelEntry = null;
            var z = 0;
            for (var ys = 0; ys < horizon; ys = ys + 1) {

                z = (zmap[ys] || -1) + zoffset;
                if (lastz < 0) lastz = z-(zmap[1]-zmap[0]);
                if (z-zoffset > 80) break;
                isTunnelEntry = false;
                isTunnelExit = false;
                //get our section for this y
                var n = currentMap.normalizeSection(currentSec,z);
                var sec = currentMap.sections[n.s];
                if (sec != lastSec) {
                    yoff = ys;
                    xoff = lastx;
                    lastdx= dx*(z-lastz);

                    if (sec.isTunnel && !lastSec.isTunnel )  { //tunnel?
                        isTunnelEntry = true;
                    }
                    zoff = z-n.o;
                }

                //look ahead to see if this is last tunnel ys
                if (sec.isTunnel && ((ys + 1) < horizon) ) {
                    var tmpsec = currentMap.sectionFromOffset(currentSec, (zmap[ys+1] || -1) + zoffset);
                    if (!currentMap.sections[tmpsec].isTunnel) {
                        isTunnelExit=true;
                    }
                }


                ddy = sec.hillType;

                rendery= rendery +dy+ ( ddy*100)*(lastz-z);

                dx = sec.cornerType;

                var xoffadj = ((1 - (ys / horizon)) *  playerScreenx);//player.x);
                x=x + dx * (lastz-z) - lastdx;  //* (lastz-z) ;//  +ddx;//+xoffadj;

                var drawx = x +xoffadj;


                if (z < 0) continue;




                var isr1 = Math.floor(z / segmentLength) % 2 == 0;
                var imgd = sec.isTunnel ? (isr1 ? tunnelRoad1 : tunnelRoad2 ): (isr1 ? road1 : road2);

                if ((Math.ceil(rendery - lasty)) > 0) {

                    c.beginPath();
                    c.drawImage(imgd, tw / 2 - w / 2 + drawx, (h - Math.floor(ys)), w, 1, 0, (h - Math.floor(rendery)), w, Math.ceil(rendery-lasty)+0.5);
                    lasty = rendery;
                    lastyz = z;
                }


                var scaleFactor = ((ys-horizon)- (roadwidthend/roadwidth)*ys)/horizon;
                var objectInstances = sec.objects;
                for (i = 0; i <  objectInstances.length; i++) {
                    if (objectInstances[i][0] > (lastz - zoff) && objectInstances[i][0] <= (z - zoff)) {
                        objects.unshift(renderObj(
                            objs[objectInstances[i][2].id],
                            (-1 * drawx + objectInstances[i][1] * (tw / 2) * scaleFactor * roadwidth),
                            rendery,
                            z,
                            scaleFactor,
                            ys
                        ));
                    }
                }

                //add cars
                for (i=0; i < aiCars.length; i++) {
                    if (currentMap.sections[aiCars[i].secIdx] == sec) {
                        if (aiCars[i].zoff > (lastz - zoff) && aiCars[i].zoff <= (z - zoff)) {
                            objects.unshift(renderObj(
                                imageForCar(aiCars[i]),
                                (-1 * drawx + aiCars[i].x * (tw / 2) * scaleFactor * roadwidth),
                                rendery,
                                z,
                                scaleFactor,
                                ys
                            ))
                        }
                    }
                }


                if (isTunnelEntry) {
                    hasTunnelExit = false;
                    theTunnelEntry = renderObj(tunnelEntry,-1*drawx,rendery,z,scaleFactor,ys);//  [[0,0,tunnelEntry],ys,drawx,z,rendery];
                    objects.unshift(theTunnelEntry);
                }

                if (isTunnelExit) {
                    hasTunnelExit = true;
                    objects.unshift( renderObj(tunnel,-1*drawx,rendery,z,scaleFactor,ys));// [[0,0,tunnel],ys,drawx,z,rendery]);
                }

                lastSec = sec;
                lastx = x;
                lastz = z;
            }

            //render objects

            //save context before clipping region
            c.save();

            //define clip;
            c.beginPath();
            c.rect(0,0,w,h - Math.floor(lasty));
            c.clip();

            //if we are in a tunnel and can't see the exit. It is all black
            var inTunnel = currentMap.sections[currentSec].isTunnel;
            if ( !hasTunnelExit) {
                if ( inTunnel || theTunnelEntry) {
                    objects.unshift(
                        renderObj(tunnelDarkness,0,lasty,z,((-1)- (roadwidthend/roadwidth)*(horizon-1))/horizon)
                    );
                }
            }

            var unclipped = false;
            for (var i=0; i < objects.length; i++) {
                var o = objects[i];

                if (!o.obj || !o.obj.i) continue;


                if (o.z < lastyz) {
                    unclipped = true; //we have gone over the horizon.
                    c.restore();
                    c.beginPath();
                }


                var ow = o.obj.i.width;
                var oh = o.obj.i.height;

                var sw = ow * o.s;
                var sh = oh * o.s;

                c.drawImage(o.obj.i,0,0,ow,oh, (w/2+ o.x) -sw/2+sw,(h-o.y)+sh,-1*sw,-1*sh );

                //now apply fog

                if (o.obj.m) {
                    var pointAlpha = fogAlpha[o.sy]/255;
                    c.save();
                    c.globalAlpha = pointAlpha;
                    c.drawImage(o.obj.m,0,0,ow,oh, (w/2+ o.x) -sw/2+sw,(h- o.y)+sh,-1*sw,-1*sh );
                    c.restore();
                }

                //apply tunnel code
                if (o.obj == tunnel || o.obj == tunnelEntry || o.obj == tunnelDarkness) {
                    c.beginPath();
                    c.fillStyle = o.obj == tunnelEntry ? "#cccccc":  "black" ;
                    //sides
                    c.fillRect(0,(h- o.y)+1,(w/2+ o.x) +sw/2+1,sh-1);
                    c.fillRect((w/2+ o.x)-sw/2-1,(h- o.y)+1,w - ((w/2+ o.x)-sw/2),sh-1);
                    //top if we are in the tunnel
                    if (inTunnel) {
                        c.fillRect(0,0,w,(h- (h- o.y))+3);
                    }

                    if (theTunnelEntry && (o.obj != tunnelEntry) ) {
                        //paint the roof.
                        var teh = theTunnelEntry.obj.i.height * theTunnelEntry.s;// sfy*tunnelEntry.i.height;
                        c.fillRect(0,h-theTunnelEntry.y +teh, w ,(h- o.y)- (h-theTunnelEntry.y+teh) +2 );
                    }
                }
            }
            if (!unclipped) {
                c.restore();
            }
        }

        function imageForCar(car) {
            var carimg = carstraight[car.color];// car.reversed ? carfront[car.color] : carstraight[car.color];
            if (car.direction == -1) carimg = carturnleft[car.color];
            if (car.direction == 1) carimg = carturnright[car.color];
            if (car.dead) carimg = cardead[car.color];
            return carimg;
        }

        function drawCar() {
            var carimg = imageForCar(player);
           /* if (player.dead) {
                c.save();
                c.globalAlpha = 0.2;
                c.drawImage(carimg.i, Math.floor(w / 2 - carimg.i.width / 2) + 0.5, h - carimg.i.height - 15);
                c.restore();
            } else {*/
                c.drawImage(carimg.i, Math.floor(w / 2 - carimg.i.width / 2) + 0.5, h - carimg.i.height - 15);
            //}
        }

        function drawHud() {
            c.beginPath();
            c.save();
            c.font = "15px Arial Black";

            c.shadowColor = "rgba(40,40,40,0.8)";
            c.fillStyle = "#CCC";
            c.shadowOffsetX = 1;
            c.shadowOffsetY = 1;
            c.fillText("Speed: ", w/50, h/20, w/10);
            c.fillText("Lap: ", 17*w/20, h/20, w/10);

            c.shadowColor = "rgba(40,40,40,0.8)";
            c.shadowOffsetX = 2;
            c.shadowOffsetY = 2;
            c.font = "20px Arial Black";
            c.fillStyle = "white";
            c.fillText( Math.floor((player.speed*200/player.maxSpeed)) + " kph", w / 50, 2*h / 20);
            c.fillText(player.lap+" of "+laps, 17*w / 20, 2*h/20);
            c.restore();
          //  c.fillText("zoff "+player.zoff,w/20, 3*h/20);
          //  c.fillText("sec "+player.secIdx, w/20, 4*h/20);
        }

        function fromEmbeddedSVG(id, mutate, callback) {
            var svg  = $s("#"+id+ " svg").cloneNode(true);

            if (mutate) { mutate(svg) }

            var xml  = new XMLSerializer().serializeToString(svg),
                data = "data:image/svg+xml;base64," + btoa(xml),
                img  = new Image();



            img.addEventListener("load",function() {
                img.height = img.naturalHeight;
                img.width = img.naturalWidth;
                //cache as canvas since these have horrible performance.
                var cv = cvs(img.width, img.height);
                var ct = cv.getContext("2d");
                ct.drawImage(img, 0,0);

                callback(cv);
            });


            img.setAttribute('src', data);

            //return img;
            //return cv;
        }

        function swapSVGColor(svg, oldColor,newColor) {
            var reds = svg.querySelectorAll("*[fill='"+oldColor+"']");
            for (var i=0; i < reds.length; i++) {
                reds[i].style.fill = newColor;
            }
        }


        function swapSVGColors(svg,colors) {
            for (var i=0; i < colors.length; i++) {
                swapSVGColor(svg,colors[i][0], colors[i][1]);
            }
        }

        //setup
        function makeGreen(svg) {
            swapSVGColors(svg,[['#f2f2f2','#00f200'],
                ['#e6e6e6','#00e600'],
                ['#cccccc','#00cc00'],
                ['#b3b3b3','#00b300']]);
        }
        function makeBlue(svg) {
            swapSVGColors(svg,[['#f2f2f2','#0000f2'],
                ['#e6e6e6','#0000e6'],
                ['#cccccc','#0000cc'],
                ['#b3b3b3','#0000b3']]);
        }
        function makeRed(svg) {
            swapSVGColors(svg,[['#f2f2f2','#f20000'],
                ['#e6e6e6','#e60000'],
                ['#cccccc','#cc0000'],
                ['#b3b3b3','#b30000']]);
        }
        function makeYellow(svg) {
            swapSVGColors(svg,[['#f2f2f2','#f2f200'],
                ['#e6e6e6','#e6e600'],
                ['#cccccc','#cccc00'],
                ['#b3b3b3','#b3b300']]);
        }


        function render () {
            drawBackground();
            draw3dRoad(player.secIdx,player.zoff,player.x);
            drawCar();
            drawHud();
        }

        function getScreenShot() {
            drawBackground();
            draw3dRoad(0,0,0);
            var tmpc = cvs(cv.width, cv.height);

            var tmpctx = tmpc.getContext("2d");
            tmpctx.drawImage(cv,0,0);
            return tmpc;
        }

        function fromLinkedSVG(id,w,h){
          var bc = cvs(50,50);
            var i = $(id);
          var cv = bc.getContext("2d");
          //cv.fillRect(0,0,360,360);
          cv.drawImage(i,0,0,50,50);
          
          var c = cvs(w,h);
          cv = c.getContext("2d");
          cv.drawImage(bc,0,0,w,h);
          
          
      
          return c;
        }
        //render setup

        var cv = $("c");
        var c = cv.getContext("2d");
        cv.width = w;
        cv.height = h;
        c.fontsize = 15;
        c.translate(0.5, 0.5); //free aa :)



        var waiting = 0;
        function loadComplete() {
            waiting = waiting - 1;
            if (waiting <= 0) {
                readyCallback()
            }
        }
        var carstraight = {}, carturnright = {}, carturnleft = {}, cardead = {};
        [
            ["red",makeRed],
            ["green", makeGreen],
            ["blue", makeBlue],
            ["grey", null],
            ["yellow", makeYellow]
        ].forEach(function(r) {
                waiting++;
                fromEmbeddedSVG("cr", r[1], function(img) {
                    carstraight[r[0]] = createObject(img);
                    cardead[r[0]] = createObject(makeTransparent(img, 0.2));
                    loadComplete();
                });
                waiting++;
                fromEmbeddedSVG("crt", r[1], function(img) {
                    carturnright[r[0]] = createObject(img);
                    carturnleft[r[0]] = createObject(flipImage(img));
                    loadComplete();
                });
            });

        var horizon = h / 2;
        var zmap = calcZMap(horizon);

        //offsets


        /* setup our two road textures to produce the effect of moving forward */
       // var roadwidth = 1.5 / 3;

        //map object representations
        function createObject(img) {
            return {i: img, m: createMask(img)};
        }


        //setup our render based on map
        var roadwidth, roadwidthend, sideRoadWidth, lineWidth,
            fog, road1, road2, tunnelRoad1, tunnelRoad2, background,fogAlpha,tunnel, tunnelEntry, tunnelDarkness;
        var o = Map.objs;
        var objs = {};

        function setType(mapType) {
            if (!mapType) mapType = "city";

            roadwidth = 1.5 / 3;
            roadwidthend = 0.04 / 3;
            sideRoadWidth = 0.05 / 2;
            lineWidth = 0.015;

            if (mapType == "city") {


                fog = createFog("rgba(255,255,255,0)", "rgba(255,255,255,0.25)", 0.25);

                road1 = drawRoadTexture("#224400", "#314430", "white", "white", fog);
                road2 = drawRoadTexture("#325611", "#435443", "#314430", "#435443", fog);

                tunnelRoad1 = drawRoadTexture("black", "#314430", "white", "white");
                tunnelRoad2 = drawRoadTexture("black", "#435443", "#314430", "#435443");
                background = createBackground("blue", "#325611", fog);
                //items
                objs[o.tree.id] =  createObject(fromLinkedSVG('deciduous',360,360)) //createObject(drawUnicode("\uD83C\uDF33", 360, 390, "darkgreen", "#0E260E", 8));
            } else if (mapType == "desert") {


                fog = createFog("rgba(237,204,169,0)", "rgba(237,204,169,0.45)", 0.15);

                road1 = drawRoadTexture("#E4BE9F", "#C89B7E", "#9C664C", "#C89B7E", fog, function (c) {
                    addRoadStripes(c, "rgba(0,0,0,0)", "#D3A281", sideRoadWidth);
                });
                road2 = drawRoadTexture("#C89B7E", "#D3A281", "#9C664C", "#D3A281", fog, function (c) {
                    addRoadStripes(c, "rgba(0,0,0,0)", "#C89B7E", sideRoadWidth);
                });


                tunnelRoad1 = drawRoadTexture("black", "#314430", "white", "white");
                tunnelRoad2 = drawRoadTexture("black", "#435443", "#314430", "#435443");
                background = createBackground("blue", "#325611", fog);

                //cactus
                objs[o.tree.id] = createObject(fromLinkedSVG('cactus',260,260)); //drawUnicode("\uD83C\uDF35", 300, 260, "darkgreen", "#0E260E", 4));
            } else if (mapType == "snow") {
                fog = createFog("rgba(255,255,255,0)", "rgba(255,255,255,0.45)", 0.15);

                road1 = drawRoadTexture("#C5D6FF", "#ADBBE9", "#9097B4", "#ADBBE9", fog); /*, function (c) {
                    addRoadStripes(c, "rgba(0,0,0,0)", "#D3A281", sideRoadWidth);
                });*/
                road2 = drawRoadTexture("#EFE7F3", "#CDCCD3", "#9097B4", "#CDCCD3", fog);/*, function (c) {
                    addRoadStripes(c, "rgba(0,0,0,0)", "#C89B7E", sideRoadWidth);
                });*/


                tunnelRoad1 = drawRoadTexture("black", "#314430", "white", "white");
                tunnelRoad2 = drawRoadTexture("black", "#435443", "#314430", "#435443");
                background = createBackground("#5F6F90", "#ADBBE9", fog);

                
                objs[o.tree.id] = createObject(fromLinkedSVG('evergreen',360,360)); // createObject(drawUnicode("\uD83C\uDF32", 300, 260, "darkgreen", "#0E260E", 8));


            }

            objs[o.signSlip.id] = createObject(createUnicodeSign(160, 160, 45, "yellow", "black", "\u2691", "black", 0.25));
            objs[o.signWarn.id] = createObject(createUnicodeSign(160, 160, 45, "white", "black", "\u26A0", "red", 0.25));

            objs[o.startLine.id] = createObject(createSign(roadwidth * w * 3 * 1.1, 100, 300, "red", "red", 0.05, function (ctx) {
                var fs = 100 * 0.65;
                ctx.font = fs + "px 'Arial Black'";
                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.fillText("\uD83C\uDFC1 START \uD83C\uDFC1", roadwidth * w * 3 * 1.1 / 2, 100 / 2 + fs / 4);
            }));
            objs[o.checkpoint.id] = createObject(createSign(roadwidth * w * 3 * 1.1, 100, 300, "white", "white", 0.05, function (ctx) {
                    var fs = 100 * 0.65;
                    ctx.font = fs + "px 'Arial Black'";
                    ctx.textAlign = "center";
                    ctx.fillStyle = "black";
                    ctx.fillText("\uD83D\uDD53 CHECKPOINT \uD83D\uDD53", roadwidth * w * 3 * 1.1 / 2, 100 / 2 + fs / 4);
                })
            );
            objs[o.tunnelLight.id] = {i: createTunnelLight()};
            //objs[o.reverser.id] = //createObject(createItem("\u21B7", roadwidth * tw * 0.25, roadwidth * tw * 0.25, "rgba(245,242,83,0.2)", "white"));
            var bw=roadwidth * tw * o.boost.width;
            objs[o.boost.id] = createObject(createItem("\u2605",bw , bw,  "orange"  /*"white"*/));
            tunnel = { i: createTunnel() };
            tunnelEntry = { i: createTunnel(true) };
            tunnelDarkness = { i: createTunnel(false,true) };

            fogAlpha = getFogSample(fog);
        }


        return {
            render: render,
            setType: setType,
            getSnapshot: getScreenShot,
            carImgs: carstraight
        }
    }

    function sidewaysPull(car,delta) {
        var pulldir = currentMap.sections[car.secIdx].direction();
        return (pulldir * car.turnSpeed * (( Math.pow(Math.min(car.speed,car.maxSpeed),3)) / (Math.pow(car.maxSpeed,3)))) * delta * -1;
    }


    function destinationBlocked(car, lookahead, x) {
        var la = currentMap.normalizeSection(car.secIdx,car.zoff + lookahead);
        var blocker = collideEx(la.s,la.o, x,car);

        return (blocker && (blocker.obj.isCar || blocker.obj[2].bump)) ? blocker : false;
    }

    function moveCar(car,delta) {

        if (!car.dead) {
            //calc velocities
            if (car.accelerating) {
                car.speed = // car.speed +  delta * car.acceleration * (1 - (Math.pow(Math.abs(car.speed), 1) / Math.pow(car.maxSpeed, 1))), car.maxSpeed);
                    car.speed + delta * car.acceleration * (1 - (Math.pow(Math.abs(car.speed), 1) / Math.pow(car.maxSpeed, 1)));//, car.maxSpeed);
            } else if (car.braking) {
                car.speed = Math.max(car.speed - delta * car.acceleration * (1 + Math.pow(car.speed, 2) / Math.pow(car.maxSpeed, 2)), -1 * car.maxSpeed / 3);
            } else {
                car.speed = car.speed > 0 ? Math.max(car.speed - delta * car.acceleration / 3, 0) : Math.min(car.speed + delta * car.acceleration / 3, 0);
            }
            var vx = 0;
            if (car.direction != 0) {
                vx = (car.reversed ? 1 : -1) * car.direction * car.turnSpeed * ((Math.min(car.speed, car.maxSpeed) / car.maxSpeed)) * delta;
            }
        }


        //apply velocity
        var off = car.zoff;
        car.zoff = off + car.speed * delta;

        if (car.dead) {
            //car.zoff = off + car.speed * delta;
            if (car.secIdx == car.lastCheckpointSection) {
                if (car.zoff <= car.lastCheckpointOffset ||
                    off <= car.lastCheckpointOffset ) { //take into account the distance we just moved
                    car.zoff = car.lastCheckpointOffset;
                    car.speed = 0;
                    //quick collision check so we don't get telefragged
                    var c = collide(car);
                    if (c) {
                        return; //wait for the other guy
                    }
                    car.dead = false;

                    return;
                }


                car.speed = (car.zoff - car.lastCheckpointOffset)/currentMap.sections[car.secIdx].len() * car.maxSpeed * 2 * -1 - car.maxSpeed/20;
            }
        }
        //normalise section
        var n = currentMap.normalizeSection(car.secIdx, car.zoff);
        if (n.s == 0 && (car.secIdx == (currentMap.sections.length-1)))  {
            car.lap++;
        }
        car.secIdx = n.s; car.zoff = n.o;


        //calculate cornering slippage
        var pull = sidewaysPull(car,delta);
        if (!car.dead) {
            if (!car.ai) {
                car.x = Math.max(Math.min(car.x + vx - pull, 1), -1);
            } else {
                if (car.x == car.destinationX) {
                    car.destinationX = undefined;
                }

                var turnspeedai =car.turnSpeed;// (car.turnSpeed / (roadwidth * tw / 2)) * delta;

                    //do we need to change lanes?
                    //var lookahead = currentMap.normalizeSection(car.secIdx,car.zoff + segmentLength);
                    var lookahead = segmentLength/2 + segmentLength * (car.speed/car.maxSpeed);
                    var roadhog = destinationBlocked(car, lookahead, car.x);// collideEx(lookahead.s,lookahead.o,car.x,car);
                    if (roadhog) {

                        var objwidth = (roadhog.obj.isCar ? 0.40 : roadhog.obj[2].width);
                        //left or right?, try the short way
                        car.destinationX = car.x + roadhog.dvx;

                        //is there someone at our destination spot already or is it off road?
                        if (car.destinationX < -0.75 || car.destinationX > 0.75 || destinationBlocked(car, lookahead/2, car.destinationX) ) {

                            //go the other way
                            car.destinationX = car.x + (roadhog.dvx > 0 ?-objwidth:objwidth) + (roadhog.dvx + (roadhog > 0 ? -objwidth: objwidth) );
                            if (car.destinationX < -0.75 || car.destinationX > 0.75 || destinationBlocked(car, lookahead/2, car.destinationX)) {
                                car.destinationX = undefined; //stay put and hit the brakes
                                car.accelerating = false;
                                car.braking = true;
                            }
                        }

                    } else {
                        //clear sailing ahead, stop breaking if we were doing so
                        car.braking = false;
                        car.accelerating = true;
                    }


                if (car.destinationX !== undefined) {

                    var turnwanted = Math.min(Math.abs(car.destinationX - car.x), turnspeedai);

                    if (car.destinationX < car.x) {
                        car.x = car.x - turnwanted * delta;
                    } else {
                        car.x = car.x + turnwanted * delta;
                    }


                }
            }
        }

        if (!car.dead && car.speed != 0) { // && (!car.ai ||  ((car.secIdx == player.secIdx)))) {
        var cr = collide(car);
        if (cr) {

            var obj = cr.obj;
            if (obj.isCar) {
                //bad news, back to last checkpoint
                car.dead = true;
                car.speed = -1 * car.maxSpeed * 5;
                car.x = Math.random() * 1.5 - 0.75;
                car.destinationX = undefined;

            }
            else if (obj[2].id == Map.objs.boost.id) {
                car.speed = car.speed * 1.1;
                obj[2] = Map.objs.disabledItem;
                setTimeout(function () {
                    obj[2] = Map.objs.boost;
                }, respawnTime);
            }
            else if (obj[2].id == Map.objs.checkpoint.id  || obj[2].id == Map.objs.startLine.id  ) {
                var cp = currentMap.normalizeSection(car.secIdx, obj[0] - segmentLength);
                car.lastCheckpointSection = cp.s;
                car.lastCheckpointOffset = cp.o;
            }
            else //sign or something boring
            {
                car.x = car.x + cr.dvx * 1.1;
                car.zoff = car.zoff + cr.dvy;
                var newSec = currentMap.normalizeSection(car.secIdx, car.zoff);
                car.secIdx = newSec.s;
                car.zoff = newSec.o;

                car.speed = car.speed * 0.9;
            }
        }
      }



    }

    function processAI(delta) {
        for (var i = 0; i < aiCars.length; i++) {
            moveCar(aiCars[i],delta);
        }
    }

    //returns true if car is behind car2check
    function isBehind(car,car2check) {
        if (car.lap < car2check.lap) {
            return true;
        }
        if (car.lap == car2check.lap) {
          if (car.secIdx < car2check.secIdx) return true;
          if (car.secIdx == car2check.secIdx && car.zoff < car2check.zoff) return true;
        }
        return false;
    }
    function overallPosition(car) {
        var pos = 1;
        for(var i = 0; i< aiCars.length; i++) {
            if (car != aiCars[i] && isBehind(car, aiCars[i])) {
                pos = pos + 1;
            }
        }

        if (car != player) {
            if (isBehind(car, player)) pos = pos + 1;
        }
        return pos;

    }


    function tick(ts) {
        if (stopped) return;


        if (!lastTick) lastTick = ts;
        var delta = ts - lastTick;
        var sf = delta/targetTimePerFrame;
        lastTick = ts;

        if (!focused) {
             requestAnimationFrame(tick);
            return;
        }



        processInput();
        moveCar(player, sf);

        if (!player.ai && player.lap > laps) {
            //elapsed time
            var elapsed = (performance.now()-startTime)/1000;//in seconds
            var elapsedMin = Math.floor(elapsed/60);
            var elapsedSec = elapsed - elapsedMin*60;

            //keep driving mario style
            player.ai = true;
            player.accelerating = true;
            aiCars.push(player);

            //show finish
            $("finished").style.display = "block";
            $("time").innerHTML=elapsedMin+"m "+elapsedSec.toFixed(2)+"s";
            $("laps").innerHTML=laps;
            $("pos").innerHTML=overallPosition(player)+" of "+(aiCars.length)
        }

        processAI(sf);

        //update background to make it look like we are turning
        backgroundoffset = (backgroundoffset + ((-1*sidewaysPull(player,sf)* (tw/3)) /3) )   % tw;

        renderer.render();
        requestAnimationFrame(tick);
    }

    function createAICars(num) {
        var cars=  [];
        for (var i = 0; i < num; i++) {
            var c = Car(-3/4+ ((i % 4 > 1) ? 1/2 : 0) + ((i%2)), 0,Math.floor(i/2)*(segmentLength/2),"grey", Math.random()*(0.005-0.0035)+ 0.0035,0.065/* 0.0208*/,Math.random() * (0.75 - 0.6) +0.6);
            c.ai = true;
            c.accelerating = true;
            cars.push(c);
        }
        return cars;
    }


    function collides(z1,x1,w1,z2,x2,w2, obj ) {
        var nvz = 0;
        var nvx = 0;
        var collx = false;
        var collz = false;
        if (z2 >= z1 && z2 <= z1+segmentLength/2) {
            nvz = -1*((z1+segmentLength/2)-z2); //how var back to we need to move to stop collision
            collz = true;
        }

        var a1 = x1-w1/2, a2 = x1+w1/ 2, b1= x2-w2/ 2, b2 = x2+w2/2;
        if ((a1 < b2 && a2 > b1)) {
            //use shortest distance
            if (Math.abs(b2 - a1) < Math.abs(a2 - b1)) {
                nvx = (b2 - a1);
            } else {
                nvx = -1*(a2 - b1);
            }

            collx = true;
        }

        if (!(collx && collz) ) {
            return null
        } else {
            //just resolve collision with shortest path
            return {dvx:nvx, dvy:nvz, obj: obj}
        }

    }


    function collide(car) {
        return collideEx(car.secIdx, car.zoff, car.x, car);

    }

    function collideEx(secIdx, zoff, x, self) {
        var carWidth = 0.4;
        //check the car against all static objects and all other cars
        var z1 = zoff;
        var x1 = x;
        var w1 = carWidth;
        var collision;

            //against other cars

            //car collisions result in going backwards
            collision = collectFirst(aiCars,function(c) {
                return (c != self) && (!c.dead)
                && (c.secIdx == secIdx)
                && (collides(z1,x1,w1, c.zoff, c.x, 0.25, c))
            });


            //against player car
            if (self != player && secIdx == player.secIdx && !player.dead) {
                collision = collides(z1,x1,w1, player.zoff, player.x, carWidth, player);
            }

        //car collisions are most important
        if (collision) return collision;


        var thisSec = currentMap.sections[secIdx];
        collision = collectFirst(thisSec.objects,function(i) {
            return i[2].width && i[2].id != Map.objs.disabledItem && collides(z1,x1,w1, i[0],i[1],i[2].width, i )
        });

        return collision;
    }

    function processInput() {
        player.direction = 0;

        if (keys["Right"] || keys["ArrowRight"]) {
            player.direction = 1;
        }
        if (keys["Left"] || keys["ArrowLeft"]) {
            player.direction = -1;
        }
        if (keys["Up"] || keys["ArrowUp"]) {
            player.accelerating = true;
            player.braking = false;
        }
        if (keys["Down"]  || keys["ArrowDown"]) {
            player.accelerating = false;
            player.braking = true;
        }
        if ((!keys["Down"] && !keys["Up"]) && (!keys["ArrowDown"] && !keys["ArrowUp"]))   {
            player.braking = false;
            player.accelerating = false;
        }
    }




    /*
     * Main
     */



    var w = 640;
    var h = 400;
    var tw = w * 3;
    var segmentLength = 5;
    var backgroundoffset = 0;
    var respawnTime = 2000;

    var currentMap = BasicMap();

    var numAIPlayers = 40;

    var startLoc = currentMap.normalizeSection(0,-1*segmentLength);
    var aiCars = {};
    var player = Car(-0.75, startLoc.s, startLoc.o, "red", 0.005, 0.0208, 0.8);




    var keys = {};



    var renderer = Renderer();

    var lastTick;
    var targetTimePerFrame = 1000/60 ; //60 frames per second as ms
    var laps = 10;
    var stopped = false;
    var startTime;

    //music
    function stop() {
        document.removeEventListener("keyup",keyup);
        document.removeEventListener("keydown",keydown);
        stopped = true;
    }

    function keyup(e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = false;
    }

    function keydown(e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = true;
        /*   if (key == "U+0020") player.reversed = !player.reversed;*/
        e.preventDefault();
        return false;
    }

    function start(carColor, lapcount, type) {
        renderer.setType(type);
        player = Car(-0.75, startLoc.s,startLoc.o,carColor,0.005,0.0208,0.8);

        laps = lapcount;

        document.addEventListener("keyup", keyup);
        document.addEventListener("keydown", keydown);


        aiCars = createAICars(numAIPlayers);
        // playMusic();
        renderer.render();

        var elm = $s(".countdown");
        $s(".countdown").style.display="block";
        var newone = elm.cloneNode(true);
        elm.parentNode.replaceChild(newone, elm);


        window.setTimeout(function(){
            $s(".countdown").style.display="none";
            //start
            startTime = performance.now();
            stopped = false;
            requestAnimationFrame(tick);
        },4100);


    }

    return {start: start, renderer: renderer, stop:stop};
}


var audio = document.createElement("audio");
var musicplayer = new CPlayer();
musicplayer.init(song);

while (musicplayer.generate() < 1) { }
var wave = musicplayer.createWave();

audio.src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));

function playMusic() {
    audio.play();
    audio.loop = true;
}

function stopMusic() {
    audio.pause();
}

var state = {
    g: null
};
//var g; //our global game instance
function main() {

  
    

    state.g = game(function() {
       var g = state.g;
        //get screenshots for our option screen
        g.renderer.setType("city");
        var city = g.renderer.getSnapshot();

        g.renderer.setType("desert");
        var desert = g.renderer.getSnapshot();

        g.renderer.setType("snow");
        var snow = g.renderer.getSnapshot();


        $s("#colorRed + label").appendChild(g.renderer.carImgs["red"].i);
        $s("#colorGreen + label").appendChild(g.renderer.carImgs["green"].i);
        $s("#colorBlue + label").appendChild(g.renderer.carImgs["blue"].i);
        $s("#colorYellow + label").appendChild(g.renderer.carImgs["yellow"].i);

        $s("#typecity + label").appendChild(city);
        $s("#typedesert + label").appendChild(desert);
        $s("#typesnow + label").appendChild(snow);
        $s(".menu").style.display = "block";
        $("loader").style.display = "none";
        //g.playMusic();
        var musicStatusEl = $("toggleMusic");
        musicStatusEl.addEventListener("click", function () {
            var classes = musicStatusEl.classList;
            if (classes.contains("muted")) {
                playMusic();
                classes.remove("muted")
            } else {
                classes.add("muted");
                stopMusic();
            }
        })
    });
}
var focused = true;

window.onfocus = function() {
    focused = true;
};
window.onblur = function() {
    focused = false;
};


function startGame() {
    //get options
    var carcolor = $s("input[name='color']:checked").value;
    var laps = parseInt($s("input[name='laps']:checked").value);
    var type = $s("input[name='type']:checked").value;
    console.log(carcolor,laps,type);


    state.g.start(carcolor,laps,type);
    $s(".menu").style.display = "none";
    if (!$("toggleMusic").classList.contains("muted"))
    {
        playMusic();
    }

}

function restartGame() {
    state.g.stop();
    $("finished").style.display = "none";
    $("loader").style.display = "block";
    state.g = game(function() {
        $("loader").style.display = "none";
       $s(".menu").style.display = "block";
     });
}

function resize() {
    var e = $s(".gs");
    if (e.style.width != "960px") {
        e.style.width="960px";
        e.style.height="600px";
    } else {
        e.style.width="640px";
        e.style.height="400px";
    }
}



window.addEventListener("load", main, false);

