/**
 * Created by David on 18/08/2015.
 */






function game() {

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
            }  else {
                return {s: secIdx, o: off};
            }
        }
    };


    Map.objs = {
        signSlip : {id: 0, width: 0.5},
        signWarn : {id: 1, width: 0.5},
        tree: {id: 2, width: 0.15},
        tunnelLight: {id: 3},
        checkpoint: {id: 4},
        reverser: {id:5, width: 0.20, item: true}
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
        objectSet.push([segmentLength,0,o.checkpoint]);
        objectSet.push([segmentLength/2,0,o.reverser]);
        var trees = objectRepeat(o.tree,2.0,0,segmentLength*2, 20);

        var tunnelLights = objectRepeat(o.tunnelLight,0,0,segmentLength,20);

        var h = Map.hillTypes;
        var c = Map.cornerTypes;
        return new Map([
            new MapSection(c.straight,20, objectSet, h.flat ,false),
            new MapSection(c.left,20, trees, h.down,false),
            new MapSection(c.straight,20, tunnelLights, h.flat,true),
            new MapSection(c.left,50,trees, h.flat,false),
            new MapSection(c.straight,20, objectSet, h.up,false),
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
            braking: false
        }
    }


    function Renderer() {
        function $(id) {
            return document.getElementById(id);
        }

        function n$(tag) {
            return document.createElement(tag)
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

        function drawRoadTexture(grassColor, roadColor, sideRoadColor, lineColor, fog) {
            var cv = n$("canvas");
            cv.width = tw;
            cv.height = h;
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

            if (fog) {
                c.save();
                c.translate(0,h);
                c.scale(1,-1);
                c.drawImage(fog, 0, 0, w, horizon, 0, 0, tw, h/2);
                c.restore();
            }
            return cv;
        }

        function createTunnel(entry,darkness) {
            var tmpc = n$("canvas");
            tmpc.width = roadwidth*tw;
            tmpc.height = h;
            var tc = tmpc.getContext("2d");

            tc.fillStyle = entry ? "#CCCCCC" :  "black";
            tc.fillRect(0,0,tmpc.width,darkness ? h : (h/3));
            return tmpc;
        }

        function createTunnelLight() {
            var size = 20;
            var tmpc = n$("canvas");
            tmpc.width = size;
            tmpc.height = 2*h/3;
            var tc = tmpc.getContext("2d");
            tc.fillStyle="yellow";
            tc.beginPath();
            tc.arc(size/2,0,size/2,0, Math.PI);
            tc.fill();
            return tmpc;

        }

        function createSign(w, h, gh, color, borderColor, contentCallback ) {
            var tmpc = n$("canvas");
            tmpc.width = w;
            tmpc.height = h+gh;
            var ctx = tmpc.getContext("2d");
            //poles
            ctx.fillStyle = "#DDD";
            ctx.fillRect(w/4-2,0,4,h+gh);
            ctx.fillRect(3*w/4-2,0,4,h+gh);
            //sign
            ctx.fillStyle = borderColor;
            ctx.fillRect(0,0,w,h);
            ctx.fillStyle = color;
            ctx.fillRect(2,2,w-4,h-4);

            if (contentCallback) contentCallback(ctx);
            return tmpc;
        }

        function createUnicodeSign(w, h, gh, color, borderColor, chr, chrColor) {
            return createSign(w,h,gh,color,borderColor, function(ctx) {
                var fs = h * 0.65;
                ctx.font = fs+"px Arial";
                ctx.fillStyle = chrColor;
                ctx.fillText(chr, w/2- fs/2,h/2+fs/2 - fs/8)
            })
        }

        function createMask(img) {
            var tmpc = n$("canvas");
            tmpc.width = img.width;
            tmpc.height = img.height;
            var tc = tmpc.getContext("2d");
            tc.drawImage(img,0,0,img.width,img.height, 0,0,img.width, img.height);

            tc.globalCompositeOperation = "source-atop";
            tc.fillStyle = "rgba(255,255,255,1.0)";
            tc.fillRect(0,0, tmpc.width, tmpc.height);
            return tmpc;
        }

        function createFog(startColor, finishColor, startOffsetPercent) {
            var tmpc = n$("canvas");
            tmpc.width = w;
            tmpc.height = horizon;
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
            var cv = n$("canvas");
            cv.width = tw;
            cv.height = h;
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


        function flipImage(image) {
            var tmpc = n$("canvas");
            tmpc.width = image.naturalWidth || image.width;
            tmpc.height = image.naturalHeight || image.height;

            var tmpctx = tmpc.getContext("2d");
            tmpctx.imageSmoothingEnabled = false;
            tmpctx.translate(image.width, 0);
            tmpctx.scale(-1, 1);
            tmpctx.drawImage(image, 0.5, 0);

/*            var imgurl = tmpc.toDataURL();
            var img = n$("img");
            img.src = imgurl;
            return img;*/
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




        function drawUnicode(char, fw, fh, color) {
            var cv = n$("canvas");
            cv.width = fw;
            cv.height = fh;
            var c = cv.getContext("2d");

            c.fillStyle = color;
            c.font = h * 0.45 +"px Arial";
            c.fillText(char,0,h*0.45,fw);
            return cv;
        }


        function createItem(char, w, h, backgroundColor, fontColor) {
            var cv = n$("canvas");
            cv.width = w;
            cv.height = h;
            var c = cv.getContext("2d");

            c.fillStyle = backgroundColor;
            c.fillRect(0,0,w,h);


            c.fillStyle = fontColor;
            c.font = "normal normal bold "+h * 0.75 +"px Arial";
            c.textAlign = "center";
            c.textBaseline = "middle";
            c.shadowColor = "rgba(40,40,40,0.8)";
            c.shadowOffsetX = 4;
            c.shadowOffsetY = 4;
            c.fillText(char,w/2,h/2,w);
            document.body.appendChild(cv);

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



        function draw3dRoad() {

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

            var zoffset = player.zoff;
            var currentSec = player.secIdx;
            var yoff = 0;
            var xoff = 0;
            var zoff = 0;
            var lastdx = 0;
            var dx = 0;
            var lastSec = currentMap.sections[currentSec];
            var changeover = false;
            var lastx = 0;
            var lastz = -1;
            var objects = [];
            //road pass
            //slope
            var ddy = 0.005;  //up = dy = 1, ddy = 0.005
            var dy = 1;

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
                //  dy = dy + ddy;
                // rendery = rendery + dy;
                z = (zmap[ys] || -1) + zoffset;
                if (lastz < 0) lastz = z;
                if (z-zoffset > 80) break;
                isTunnelEntry = false;
                isTunnelExit = false;
                //get our section for this y
                var sec = currentMap.sections[currentMap.sectionFromOffset(currentSec, z)];
                if (sec != lastSec) {
                    yoff = ys;
                    xoff = lastx;
                    lastdx= dx*(z-lastz);

                    if (sec.isTunnel && !lastSec.isTunnel )  { //tunnel?
                        isTunnelEntry = true;
                    }
                    changeover = ys;
                    zoff = lastz;
                }

                //look ahead to see if this is last tunnel ys
                if (sec.isTunnel && ((ys + 1) < horizon) ) {
                    var tmpsec = currentMap.sectionFromOffset(currentSec, (zmap[ys+1] || -1) + zoffset);
                    if (!currentMap.sections[tmpsec].isTunnel) {
                        isTunnelExit=true;
                    }
                }


                ddy = sec.hillType;//0.010;  //up = dy = 1, ddy = 0.005
                //dy = dy + ddy;
                rendery= rendery +dy+ ( ddy*100)*(lastz-z);
                //(1 - (ys / horizon)) * vx ensures that when the road moves left and right, the vanishing point remains the same
                // if (!yoff) {
                //     x = (1 - (ys / horizon)) * vx;
                // }

                dx = sec.cornerType;
                //ddx = ddx + dx;

                var xoffadj = ((1 - (ys / horizon)) * player.x);
                x=x + dx * (lastz-z) - lastdx;  //* (lastz-z) ;//  +ddx;//+xoffadj;

                var drawx = x +xoffadj;


//           x = x + (cornerTypes[cornertype][Math.floor(((ys-yoff)/(horizon-yoff) * horizon))] || 0) + xoff; //+ (ys-yoff)*dx;
                // x = x + (cornerTypes[cornertype][ys-yoff] || 0) + xoff + (ys-yoff)*dx;

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
                var objectInstances = sec.objects.filter(function(i) { return i[0] > (lastz - zoff) && i[0] <= (z - zoff)  });
                for (i = 0; i < objectInstances.length; i++) {
                    //o[0][0] = z, o[0][1]=x, o[0][2]=objecttype, o[1] = ys, o[2]=drawx, o[3]=z, o[4]=rendery
                    objects.unshift(renderObj(
                        objs[objectInstances[i][2].id],
                        (-1*drawx+  objectInstances[i][1]*(tw/2)*scaleFactor*roadwidth),
                        rendery,
                        z,
                        scaleFactor,
                        ys
                    ));

                   // objects.unshift([ [ois[i][0], ois[i][1], objs[ois[i][2]]] ,ys,drawx,z,rendery] );
                }

                //add cars
                var visibleCars = aiCars.filter(function(i) { return currentMap.sections[i.secIdx] == sec })
                    .filter(function(i) { return i.zoff > (lastz - zoff) && i.zoff <= (z - zoff)  });
                for (i=0; i < visibleCars.length; i++) {
                    objects.unshift(renderObj(
                        imageForCar(visibleCars[i]),
                        (-1*drawx+  visibleCars[i].x*(tw/2)*scaleFactor*roadwidth),
                        rendery,
                        z,
                        scaleFactor,
                        ys
                    ))
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
                      /*  [
                        [0, 0, tunnelDarkness],
                            horizon - 1,
                        0,
                        z,
                        lasty
                    ]);*/
                }
            }

            var unclipped = false;
            for (var i=0; i < objects.length; i++) {
                var o = objects[i];

                if (o.z < lastyz) {
                    unclipped = true; //we have gone over the horizon.
                    c.restore();
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
            var carimg = car.reversed ? carfront[car.color] : carstraight[car.color];
            if (car.direction == -1) carimg = carturnleft[car.color];
            if (car.direction == 1) carimg = carturnright[car.color];
            return carimg;
        }

        function drawCar() {
            var carimg = imageForCar(player);
            c.drawImage(carimg.i, Math.floor(w / 2 - carimg.i.width / 2) + 0.5, h - carimg.i.height - 15);
        }

        function drawHud() {
            c.font = "15px Arial";
            c.fillStyle = "white";
            c.fillText("Speed: " + Math.floor((player.speed*200/player.maxSpeed)), w / 20, h / 20);
            c.fillText("Lap: "+player.lap,  w / 20, 2*h/20);
        }

        function fromEmbeddedSVG(id, mutate) {
            var svg  = $(id).getSVGDocument().cloneNode(true);

            if (mutate) { mutate(svg) }

            var xml  = new XMLSerializer().serializeToString(svg),
                data = "data:image/svg+xml;base64," + btoa(xml),
                img  = new Image();
            img.setAttribute('src', data);
            img.height = img.naturalHeight;
            img.width = img.naturalWidth;

            //cache as canvas since these have horrible performance.
            var cv = n$("canvas");
            cv.width = img.width;
            cv.height = img.height;
            var ct = cv.getContext("2d");
            ct.drawImage(img, 0,0);


            //return img;
            return cv;
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
            draw3dRoad();
            drawCar();
            drawHud();
        }


        //render setup

        var cv = $("c");
        var c = cv.getContext("2d");
        cv.width = w;
        cv.height = h;
        c.fontsize = 15;
        c.translate(0.5, 0.5); //free aa :)



        var carstraight = {}, carturnright = {}, carturnleft = {}, carfront = {};
        [
            ["red",makeRed],
            ["green", makeGreen],
            ["blue", makeBlue],
            ["grey", null],
            ["yellow", makeYellow]
        ].forEach(function(r) {
                carstraight[r[0]]= createObject(fromEmbeddedSVG("cr",r[1]));
                carturnright[r[0]]= createObject(fromEmbeddedSVG("crt",r[1]));
                carfront[r[0]]=createObject(fromEmbeddedSVG("crf",r[1]));
                carturnleft[r[0]]=createObject(flipImage(carturnright[r[0]].i));
            });

        var horizon = h / 2;
        var zmap = calcZMap(horizon);

        //offsets


        /* setup our two road textures to produce the effect of moving forward */
       // var roadwidth = 1.5 / 3;
        var roadwidthend = 0.04 / 3;
        var sideRoadWidth = 0.05 / 2;
        var lineWidth = 0.015;


        var fog = createFog("rgba(255,255,255,0)","rgba(255,255,255,0.25)", 0.25);

        var road1 = drawRoadTexture("#224400", "#314430", "white", "white",fog);
        var road2 = drawRoadTexture("#325611", "#435443", "#314430", "#435443",fog);
        var tunnelRoad1 = drawRoadTexture("black", "#314430", "white", "white");
        var tunnelRoad2 = drawRoadTexture("black", "#435443", "#314430", "#435443");
        var background = createBackground("blue","#325611", fog);

        //map object representations
        function createObject(img) {
            return {i: img, m: createMask(img)};
        }
        var o = Map.objs;
        var objs = {};
        objs[o.signSlip.id] = createObject(createUnicodeSign(160,160,45,"yellow","black", "\u26D0","black"));
        objs[o.signWarn.id] = createObject(createUnicodeSign(160,160,45,"white", "black", "\u26A0", "red" ));
        objs[o.tree.id] = createObject(drawUnicode("\uD83C\uDF33",160,190,"darkgreen"));
        objs[o.checkpoint.id] = createObject(createSign(roadwidth*w*3*1.1,100,300, "red","red",function(ctx){
                var fs = 100 * 0.65;
                ctx.font = "normal normal bold "+fs+"px Arial";
                ctx.textAlign = "center";
                ctx.fillStyle = "white";
                ctx.fillText("Checkpoint", roadwidth*w*3*1.1/2,100/2+fs/4);
            })
        );
        objs[o.tunnelLight.id] = {i: createTunnelLight()};

        objs[o.reverser.id] = createObject(createItem("\u21B7",roadwidth*tw*0.25,roadwidth*tw*0.25,"rgba(245,242,83,0.2)","white" ));




        //hard coded objs
        var tunnel = { i: createTunnel() };
        var tunnelEntry = { i: createTunnel(true) };
        var tunnelDarkness = { i: createTunnel(false,true) };

        var fogAlpha = getFogSample(fog); //a sample of our fogs alpha so we can apply it to objects after road has been rendered


        return {
            render: render
        }
    }

    function sidewaysPull(car,delta) {
        var pulldir = currentMap.sections[car.secIdx].direction();
        return (pulldir * car.turnSpeed * (Math.pow(car.speed,5)) / (Math.pow(car.maxSpeed,5))*1.05) * delta;
    }

    function moveCar(car,delta) {

        //calc velocities
        if (car.accelerating) {
            car.speed = Math.min(car.speed + delta * car.acceleration * (1-(Math.pow(car.speed,1)/Math.pow(car.maxSpeed,1)))   , car.maxSpeed);
        } else if (car.braking) {
            car.speed = Math.max(car.speed - delta*car.acceleration*2, -1*car.maxSpeed/3);
        } else {
            car.speed = car.speed > 0 ? Math.max(car.speed - delta*car.acceleration/3,0): Math.min(car.speed + delta*car.acceleration/3,0);
        }
        var vx = 0 ;
        if (car.direction != 0) {
            vx = car.direction * car.turnSpeed * (car.speed/car.maxSpeed) * delta;
        }

        var oldx = car.x;
        var oldz = car.zoff;
        var oldsec = car.secIdx;

        //apply velocity
        var off = car.zoff;
        car.zoff = off + car.speed;

        //normalise section
              var n = currentMap.normalizeSection(car.secIdx, car.zoff);
        if (n.s == 0 && (car.secIdx == (currentMap.sections.length-1)))  car.lap++;
        car.secIdx = n.s; car.zoff = n.o;


        //calculate cornering slippage
        var pull = sidewaysPull(car,delta);
        if (!car.ai) {
            car.x = Math.max(Math.min(car.x + vx - pull, w),-w);
        } else {
            if (car.x == car.destinationX) {
                car.destinationX = 0;
            }
            if (Math.abs(car.destinationX - car.x) >  0.05) {
                car.x = car.x  + 0.05*delta*((car.destinationX - car.x) > 0 ? 1 : -1);
            }
        }

        if (!car.ai ||  ((car.secIdx == player.secIdx))) {
        var cr = collide(car);
        if (cr) {



            car.x = car.x + cr.dvx;
            car.zoff = car.zoff + cr.dvy;

            var newSec = currentMap.normalizeSection(car.secIdx, car.zoff);
            car.secIdx = newSec.s;
            car.zoff = newSec.o;

            //car.zoff = oldz;
            //car.secIdx = oldsec;
            car.speed = car.speed + cr.dvy * 1.1;
            if (car.ai) {
                //change lanes
                if (!car.destinationX) {
                    var roll = Math.random();
                    if (car.x >= 3/4 || roll < 0.5) {
                        car.destinationX = car.x - 0.5;
                    }
                    if (car.x <= -3/4 || roll >= 0.5) {
                        car.destinationX = car.x + 0.5;
                    }
                }
            }
          }
        }

        //TODO collide

    }

    function processAI(delta) {
        for (var i = 0; i < aiCars.length; i++) {
            moveCar(aiCars[i],delta);
        }
    }

    var tcount = 0;
    function tick(ts) {
        var start = performance.now();
        if (!lastTick) lastTick = ts;
        var delta = ts - lastTick;
        var sf = delta/targetTimePerFrame;
        lastTick = ts;
        //TODO use ts instead of the fact we were called to determing zoff etc
        processInput();
        moveCar(player, sf);

        processAI(sf);

        //update background to make it look like we are turning
        backgroundoffset = (backgroundoffset + sidewaysPull(player,sf)/3) % tw;

        renderer.render();
        var ms = performance.now() - start;
        if (tcount++ > 120) {
            console.log("frame time:",ms,"spare:", (targetTimePerFrame-ms), (targetTimePerFrame-ms)*100/targetTimePerFrame+"%");
            tcount = 0;
        }
        requestAnimationFrame(tick);
    }

    function createAICars(num) {
        var cars=  [];
        for (var i = 0; i < num; i++) {
            var c = Car(-3/4 + (1/2*(i%4)), 0,Math.floor(i/4)*segmentLength,"grey",0.005,10,Math.random() * (0.75 - 0.5) +0.5);
            c.ai = true;
            c.accelerating = true;
            cars.push(c);
        }
        return cars;
    }


    function collides(z1,x1,w1,z2,x2,w2 ) {
        var nvz = 0;
        var nvx = 0;
        if (z2 > z1 && z2 < z1+segmentLength/2) {
            nvz = -1*((z1+segmentLength/2)-z2); //how var back to we need to move to stop collision
        }

        var a1 = x1-w1/2, a2 = x1+w1/ 2, b1= x2-w2/ 2, b2 = x2+w1/2;
        if ((a1 < b2 && a2 > b1)) {
            nvx = -1 * Math.min(Math.abs(b2 - a1), Math.abs(a2 - b1));
        }

        if ((nvz >= 0) || (nvx >= 0)) {
            return null
        } else {
            //just resolve collision with shortest path
           if (nvx > nvz) {
               nvx = 0;
           } else {
               nvz = 0;
           }
            return {dvx:nvx, dvy:nvz}
        }





        /*if ((z2 > z1 && z2 < z1+segmentLength/2)
        && !(x1-w1/2 > x2+w2/2 || x1+w1/2 < x2-w2/2)) {
            //return new vx and vz values to stop "going through" other entity

        }*/
    }




    function collide(car) {

        //todo change to for loops and apply collides result to speed,zoff and x
        //check the car against all static objects and all other cars
        var z1 = car.zoff;
        var x1 = car.ai ? car.x : (-1*car.x/((roadwidth/2)*tw));
        var w1 = 0.25;

        var thisSec = currentMap.sections[car.secIdx];
        var collision = collectFirst(thisSec.objects,function(i) {
            return i[2].width && collides(z1,x1,w1, i[0],i[1],i[2].width )
        });

        if (!collision) {
            //against other cars
            collision = collectFirst(aiCars,function(c) {
                return (c != car)
                && (c.secIdx == car.secIdx)
                && (collides(z1,x1,w1, c.zoff, c.x, 0.25))
            });
        }

        if (!collision) {
            //against player car
            if (car.ai && car.secIdx == player.secIdx) {
                collision = collides(z1,x1,w1, player.zoff, (-1*player.x/((roadwidth/2)*tw)), 0.25);
            }
        }



      //  for (var i=0; i < collision.length; i++) {
          //  console.log("bang ",collision[i]);
       // }

       // for (var i=0; i < collision2.length; i++) {
          //  console.log("Carbang", collision2[i]);
        //}
        return collision;
    }

    function processInput() {
        player.direction = 0;
        //carDirection = 0;

        if (keys["Right"]) {
          // vx = vx + ((carturnspeed * vy / maxvy));

            player.direction = 1;
        }
        if (keys["Left"]) {
        //    vx = vx - ((carturnspeed * vy / maxvy));

            player.direction = -1;
        }
        if (keys["Up"]) {
          /*  if (vy < maxvy) {
                vy = vy + caracceleration
            }
            */
            player.accelerating = true;
            player.braking = false;
        }
        if (keys["Down"]) {
                //vy = vy - caracceleration*2;
                //if (vy < -1*maxvy/3) vy = -1*maxvy/3;
            player.accelerating = false;
            player.braking = true;
        }

        if (!keys["Down"] && !keys["Up"]) {
            //var nvy = vy - caracceleration /3;
            //if (nvy > 0) vy = nvy;
            player.braking = false;
            player.accelerating = false;

        }

    }



    /*
     * Main
     */

//canvas

    var w = 640;
    var h = 400;
    var tw = w * 3;
    var segmentLength = 5;
    var backgroundoffset = 0;

    var player = Car(0,0,0,"red",0.005,10,0.8);
    var aiCars = createAICars(0);




    var keys = {};

    /* our location */
    var currentMap = BasicMap();
    var roadwidth = 1.5 / 3;

    var renderer = Renderer();


   /* var ctx = signSlip.getContext("2d");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(0,0, signSlip.width, signSlip.height);*/
    //document.getElementsByTagName("body")[0].appendChild(signSlip);
    //document.getElementsByTagName("body")[0].appendChild(signWarn);
    //document.getElementsByTagName("body")[0].appendChild(greenCar);
    var lastTick;
    var targetTimePerFrame = 1000/60 ; //60 frames per second as ms
    requestAnimationFrame(tick);

    document.addEventListener("keyup", function (e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = false;
    });

    document.addEventListener("keydown", function (e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = true;
        if (key == "U+0020") player.reversed = !player.reversed;
        e.preventDefault();
        return false;
    });



    //music
/*
    var player = new CPlayer();
    player.init(song);

    while (player.generate() < 1) { }
    var wave = player.createWave();
    var audio = document.createElement("audio");
    audio.src = URL.createObjectURL(new Blob([wave], {type: "audio/wav"}));
    audio.play();
    audio.loop = true;
*/

    /* show road
     var r2 = document.createElement("img");
     r2.src = tv2.toDataURL('image/png');

     //r2.src = tv.toDataURL('image/png');
     r2d = t2.getImageData(0,0,tw,h);
     */
}
window.addEventListener("load", game, false);
//game();