/**
 * Created by David on 18/08/2015.
 */

function game() {

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
        //g.addColorStop(1,startColor);
        tc.fillStyle = g;
        //tc.fillRect(0,gradientTop,w,gradientHeight);
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
        tmpc.width = image.naturalWidth;
        tmpc.height = image.naturalHeight;

        var tmpctx = tmpc.getContext("2d");
        tmpctx.imageSmoothingEnabled = false;
        tmpctx.translate(image.width, 0);
        tmpctx.scale(-1, 1);
        tmpctx.drawImage(image, 0.5, 0);

        var imgurl = tmpc.toDataURL();
        var img = n$("img");
        img.src = imgurl;
        return img;
    }




    function calcZMap() {
        var zmap = [];
        for (var y = horizon; y > 0; y--) {
            zmap.push((cy * cz) / y);
        }
        return zmap;
    }

//calculate our xmaps using an ellipse equation
//where sharpness of 1 is max right, and 0 sharpness is a straight line
//and direction = -1 for left turn +1 for right turn
// x = ±(a sqrt(b^2-y^2))/b and b!=0 and a!=0
    /*
    function calculateXMap(sharpness, direction) {
        var a = w / 2 * sharpness;
        var b = horizon;
        var xmap = [];
        for (var y = 0; y < horizon; y++) {
            xmap.push(((a * Math.sqrt(b * b - y * y)) / b) * direction - a*direction);
        }
        xmap[0] = 0;
        return adjustcurveperspective(xmap);
    }
*/
    function calculateMaps() {
        zmap = calcZMap();
  //      rightDx = calculateXMap(1, 1);
    //    leftDx = calculateXMap(1, -1);

    }


    function adjustcurveperspective(curve) {
        var newcurve = [];
        for (var i = 0; i < horizon; i++) {
            newcurve.push((i * i * i * i/ (horizon * horizon* horizon*horizon)) * curve[i]);
        }
        return newcurve;
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


    function drawBackground() {
        //c.rect(0, 0, w, h);
        //c.fillStyle = skycolor;
        //c.fill();
        //left offset
        var bo = (backgroundoffset < 0) ? tw+backgroundoffset : backgroundoffset;
        var w1 = Math.min(w, tw-bo);
        c.drawImage(background, bo,0,w1,h,0,0,w1,h);

        //did we not cover whole background
        if (w1 < w) {
            c.drawImage(background, 0,0,w-w1,h,w1,0,w-w1,h);
        }
    }



    function draw3dRoad(zoffset) {
        var yoff = 0;
        var xoff = 0;
        var zoff = 0;
        var lastdx = 0;
        var dx = 0;
        var lastSec = currentSection;
        var changeover = false;
        var lastx = 0;
        var lastz = -1;
        var objects = [];
        //road pass
        //slope
        var ddy = 0.005;  //up = dy = 1, ddy = 0.005
        var dy = 1;
        var ddx = 0;
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
            //TODO this should be based on the current part of the map, not hardcoded rightDx[ys]
            //get our section for this y
            var sec = sectionFromOffset(z);
            if (sec != lastSec) {
                yoff = ys;
                xoff = lastx;
                lastdx= dx*(z-lastz);

                if (currentMap[sec][4] && !currentMap[lastSec][4] )  { //tunnel?
                    isTunnelEntry = true;
                }



                changeover = ys;
                zoff = lastz;
            }


            //look ahead to see if this is last tunnel ys
            if (currentMap[sec][4] && ((ys + 1) < horizon) ) {
                var tmpsec = sectionFromOffset((zmap[ys+1] || -1) + zoffset);
                if (!currentMap[tmpsec][4]) {
                    isTunnelExit=true;
                }
            }

            var hillType = currentMap[sec][3];
            ddy = hillTypes[hillType];//0.010;  //up = dy = 1, ddy = 0.005
            //dy = dy + ddy;
            rendery= rendery +dy+ ( ddy*100)*(lastz-z);
            //(1 - (ys / horizon)) * vx ensures that when the road moves left and right, the vanishing point remains the same
           // if (!yoff) {
           //     x = (1 - (ys / horizon)) * vx;
           // }

            var cornertype = currentMap[sec][0];
            dx = cornerTypes[cornertype]*100;
            //ddx = ddx + dx;


            var xoffadj = ((1 - (ys / horizon)) * vx);
            x=x + dx * (lastz-z) - lastdx;  //* (lastz-z) ;//  +ddx;//+xoffadj;

            var drawx = x +xoffadj;


//           x = x + (cornerTypes[cornertype][Math.floor(((ys-yoff)/(horizon-yoff) * horizon))] || 0) + xoff; //+ (ys-yoff)*dx;
           // x = x + (cornerTypes[cornertype][ys-yoff] || 0) + xoff + (ys-yoff)*dx;

            if (z < 0) continue;


            //TODO hills

            var isr1 = Math.floor(z / segmentLength) % 2 == 0;
            var imgd = (sec == 2) ? (isr1 ? tunnelRoad1 : tunnelRoad2 ): (isr1 ? road1 : road2);

            if ((Math.ceil(rendery - lasty)) > 0) {

                c.beginPath();
                c.drawImage(imgd, tw / 2 - w / 2 + drawx, (h - Math.floor(ys)), w, 1, 0, (h - Math.floor(rendery)), w, Math.ceil(rendery-lasty)+0.5);
                lasty = rendery;
                lastyz = z;
            }


            var objs = currentMap[sec][2].filter(function(i) { return i[0] > (lastz - zoff) && i[0] <= (z - zoff)  });
            for (i = 0; i < objs.length; i++) {
                objects.unshift([objs[i],ys,drawx,z,rendery] );
            }

            if (isTunnelEntry) {
                hasTunnelExit = false;
                theTunnelEntry = [[0,0,tunnelEntry],ys,drawx,z,rendery];
                objects.unshift(theTunnelEntry);
            }

            if (isTunnelExit) {
                hasTunnelExit = true;
                objects.unshift([[0,0,tunnel],ys,drawx,z,rendery]);
            }

            lastSec = sec;
            //lastdx = x - lastx;
            lastx = x;
            lastz = z;
        }



        //fog
        //c.globalCompositeOperation = "multiply";
        //c.drawImage(fog,0,0,w,h,0,0,w,h);

        //render objects

        //save context before clipping region
        c.save();

        //define clip;
        c.beginPath();
        c.rect(0,0,w,h - Math.floor(lasty));
        c.clip();

        //if we are in a tunnel and can't see the exit. It is all black
        if ( !hasTunnelExit) {
            if (currentMap[currentSection][4] || theTunnelEntry) {
                objects.unshift([
                    [0, 0, tunnelDarkness],
                        horizon - 1,
                    0,
                    z,
                    lasty
                ]);
            }
        }

        var unclipped = false;
        for (var i=0; i < objects.length; i++) {


            var o = objects[i];
            if (o[3] < lastyz) {
                unclipped = true; //we have gone over the horizon.
                c.restore();
            }
            var y = o[1];
            var yrender = o[4];
            var scalefactorx = ((y-horizon)- (roadwidthend/roadwidth)*y)/horizon;
            x = (-1*o[2]+  o[0][1]*(w/2)*scalefactorx*roadwidth*3);//  , (y/horizon)*scalefactorx + o[2]

            var ow = o[0][2]['i'].width;

            var oh = o[0][2]['i'].height;

            var sw = ow * scalefactorx;
            var sh = oh * scalefactorx;

            c.drawImage(o[0][2]['i'],0,0,ow,oh, (w/2+ x) -sw/2+sw,(h-yrender)+sh,-1*sw,-1*sh );

            //now apply fog
            //todo don't use getimagedata here, use a lookup built when we created the fog.

            if (o[0][2]['m']) {
                var pointAlpha = fogAlpha[ y]/255;
                c.save();
                c.globalAlpha = pointAlpha;
                c.drawImage(o[0][2]['m'],0,0,ow,oh, (w/2+ x) -sw/2+sw,(h-yrender)+sh,-1*sw,-1*sh );
                c.restore();
            }

            //apply tunnel code
            if (o[0][2] == tunnel || o[0][2] == tunnelEntry || o[0][2] == tunnelDarkness) {

                c.fillStyle = o[0][2] == tunnelEntry ? "#cccccc":  "black" ;
                //sides
                c.fillRect(0,(h-yrender)+1,(w/2+ x) +sw/2+1,sh-1);
                c.fillRect((w/2+x)-sw/2-1,(h-yrender)+1,w - ((w/2+x)-sw/2),sh-1);
                //top if we are in the tunnel
                if (currentMap[currentSection][4]) {
                    c.fillRect(0,0,w,(h- (h-yrender))+3);
                }

                if (theTunnelEntry && (o[0][2] != tunnelEntry) ) {
                   var tey = theTunnelEntry[1];
                    var sfy = ((tey-horizon)- (roadwidthend/roadwidth)*tey)/horizon;
                    var teh = sfy*tunnelEntry.i.height;
                    c.fillRect(0,h-theTunnelEntry[4]+teh, w ,(h-yrender)- (h-theTunnelEntry[4]+teh) +2 );

                }
            }
            /*var fogAtPoint = fog.getImageData(0,y,1,1);
            var alphaAtPoint = fogAp
            c.save();
            c.globalAlpha = alphaAtPoint;
            c.drawImage(o[0][2]['m'],0,0,ow,oh, (w/2+ x) -sw/2,(h-yrender),sw,sh );
            c.restore();
*/


        }
        if (!unclipped) {
            c.restore();
        }


    }

    function drawCar() {
        var carimg = carReverse ? carfront[carColor] : carstraight[carColor];
        if (carDirection == -1) carimg = carturnleft[carColor];
        if (carDirection == 1) carimg = carturnright[carColor];
        c.drawImage(carimg, Math.floor(w / 2 - carimg.width / 2) + 0.5, h - carimg.height - 15);
    }

    function drawHud() {
        c.font = "15px Arial";
        c.fillStyle = "white";
        c.fillText("Speed: " + Math.floor((vy / maxvy) * carTopSpeedDisplay), w / 20, h / 20);

        c.fillText("Lap: "+lap,  w / 20, 2*h/20);
        //test snowman :)
        //c.font = "130px Arial";
        //c.fillText("\u2603",120,120);
    }

    function sectionFromOffset(offz) {
        var sec = currentSection;
        while (true) {
            var s = currentMap[sec];
            if (offz > s[1]*segmentLength) {
                offz = offz - s[1]*segmentLength; //track as offset into next section
                sec++;
                if (sec >= currentMap.length) {
                    sec = 0;
                }
            } else {
                return sec;
            }
        }
    }

    function move() {
        off = off + vy;
        var olds = currentSection;
        currentSection = sectionFromOffset(off);
        if (olds != currentSection) {
            off = off - currentMap[olds][1]*segmentLength;
        }
        if (olds > currentSection) {
            lap++;
        }
        var pulldir = currentMap[currentSection][0];
        var pullamount = pulldir*carturnspeed * ((vy*vy*vy*vy*vy) / (maxvy*maxvy*maxvy*maxvy*maxvy))*1.05;

        backgroundoffset = (backgroundoffset + pullamount/3) % tw;

        vx = vx - pullamount;
        if (vx > w ) vx = w;
        if (vx < -1*w) vx = -1*w;
    }

    function render(ts) {
        processInput();

        move();

        drawBackground();
        draw3dRoad(off);
        drawCar();
        drawHud();
        requestAnimationFrame(render);
    }


    function processInput() {
        carDirection = 0;

        if (keys["Right"]) {
            vx = vx + ((carturnspeed * vy / maxvy));

            carDirection = 1;
        }
        if (keys["Left"]) {
            vx = vx - ((carturnspeed * vy / maxvy));

            carDirection = -1;
        }
        if (keys["Up"]) {
            if (vy < maxvy) {
                vy = vy + caracceleration
            }

        }
        if (keys["Down"]) {
                vy = vy - caracceleration*2;
                if (vy < -1*maxvy/3) vy = -1*maxvy/3;

        }

        if (!keys["Down"] && !keys["Up"]) {
            var nvy = vy - caracceleration /3;
            if (nvy > 0) vy = nvy;

        }

    }



    /*
     * Main
     */

//canvas
    var cv = $("c");
    var c = cv.getContext("2d");
    var w = 640;
    var h = 400;
    cv.width = w;
    cv.height = h;
    c.fontsize = 15;
    c.translate(0.5, 0.5); //free aa :)


//road texture width
    var tw = w * 3;


    var vx = 0; //vehicle offset from center
    var vy = 0; //vehicle speed
    var maxvy = 0.8;

    var off = 0; //offset into track
    var segmentLength = 5;

    var cy =  50; //world camera height
    var cz = 8; //world camera distance from screen

//offsets
    var horizon = h / 2;
    var zmap, rightDx, leftDx;
    calculateMaps();


    /* setup our two road textures to produce the effect of moving forward */
    var roadwidth = 1.5 / 3;
    var roadwidthend = 0.04 / 3;
    var sideRoadWidth = 0.05 / 2;
    var lineWidth = 0.015;


    var fog = createFog("rgba(255,255,255,0)","rgba(255,255,255,0.25)", 0.25);

    var road1 = drawRoadTexture("#224400", "#314430", "white", "white",fog);
    var road2 = drawRoadTexture("#325611", "#435443", "#314430", "#435443",fog);



    var tunnelRoad1 = drawRoadTexture("black", "#314430", "white", "white");
    var tunnelRoad2 = drawRoadTexture("black", "#435443", "#314430", "#435443");


    var backgroundoffset = 0;
    var background = createBackground("blue","#325611", fog);

//map
    //map [[ corner type, number of segments ]]
    // 0 is straight, -1 = left, 1 = right

    var cornerTypes = {};
    /*cornerTypes[-1] = leftDx;
    cornerTypes[-0.5] =calculateXMap(0.5, -1);
    cornerTypes[1] = rightDx;
    cornerTypes[0] = []; for (var i = 0; i < horizon; i++) { cornerTypes[0][i] = 0;}
    */



    cornerTypes[0] = 0;
    cornerTypes[-1] = - 0.02; //0.01
    cornerTypes[1] =  +0.02;


    var hillTypes = {};
    hillTypes[0] = 0;
    hillTypes[-1] = 0.005;
    hillTypes[1] = -0.005;

    function createObject(img) {
        return {i: img, m: createMask(img)};
    }

    var signSlip = createObject(createUnicodeSign(160,160,45,"yellow","black", "\u26D0","black"));
    var signWarn = createObject(createUnicodeSign(160,160,45,"white", "black", "\u26A0", "red" ));
    var tree = createObject(drawUnicode("\uD83C\uDF33",160,190,"darkgreen"));

    //signSlip.m = createMask(signSlip.i);

    var tunnelLight = {i: createTunnelLight()};

    var checkpoint = createObject(createSign(roadwidth*w*3*1.1,100,300, "red","red",function(ctx){
            var fs = 100 * 0.65;
            ctx.font = "normal normal bold "+fs+"px Arial";
            ctx.textAlign = "center";
            ctx.fillStyle = "white";
            ctx.fillText("Checkpoint", roadwidth*w*3*1.1/2,100/2+fs/4);
        })
    );

    var tunnel = { i: createTunnel() };
    var tunnelEntry = { i: createTunnel(true) };
    var tunnelDarkness = { i: createTunnel(false,true) };


    var fogAlpha = getFogSample(fog); //a sample of or fogs alpha so we can apply it to objects after seen has been rendered
    var objectSet = [];
    function objectRepeat(type, offset, startDist, distBetween, count) {
        var r = [];
        for (var i=0; i < count; i++) {
            r.push([startDist+i*(distBetween),offset, type]);
        }
        return r;
    }

    objectSet = objectSet.concat(objectRepeat(signWarn, 1.25 , 0,segmentLength,5 ));

    objectSet = objectSet.concat(objectRepeat(signSlip, -1.25,segmentLength*15,segmentLength,5 ));
    objectSet.push([segmentLength,0,checkpoint]);

    var trees = [];
    trees = trees.concat(objectRepeat(tree,2.0,0,segmentLength*2, 20));

    var justcheckpoint = [[segmentLength,0,checkpoint]];


    var tunnelLights = [];
    tunnelLights = tunnelLights.concat(objectRepeat(tunnelLight,0,0,segmentLength,20));

    var basicmap = [
        [0,20, objectSet,0,false],

        //[-0.5,5, justcheckpoint],
        [-1,20, trees,-1,false],
        [0,20, tunnelLights, 0,true],
        [1,50,trees,0,false],
        [0,20, objectSet,1,false],
        [1, 20, objectSet,-1,false]
    ];

    function fromEmbeddedSVG(id, mutate) {
        var svg  = $(id).getSVGDocument().cloneNode(true);

        if (mutate) { mutate(svg) }

        var xml  = new XMLSerializer().serializeToString(svg),
            data = "data:image/svg+xml;base64," + btoa(xml),
            img  = new Image();
            img.setAttribute('src', data);
            img.height = img.naturalHeight;
            img.width = img.naturalWidth;

        return img;
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
    /* setup our car */
    var carturnspeed = 10;
    var caracceleration = 0.005;
    var carTopSpeedDisplay = 160;
    var carReverse = false;
    var carColor = "blue";
   function makeGreen(svg) {
     //  swapSVGColor(svg,"#800000","#008000");
     //  lighter -> darker
     // 'f2f2f2','#e6e6e6','#cccccc','#b3b3b3'
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

    var carstraight = {}, carturnright = {}, carturnleft = {}, carfront = {};
    [
        ["red",makeRed],
        ["green", makeGreen],
        ["blue", makeBlue],
        ["grey", null],
        ["yellow", makeYellow]
    ].forEach(function(r) {
        carstraight[r[0]]= fromEmbeddedSVG("cr",r[1]);
        carturnright[r[0]]= fromEmbeddedSVG("crt",r[1]);
        carfront[r[0]]=fromEmbeddedSVG("crf",r[1]);
        carturnleft[r[0]]=flipImage(carturnright[r[0]]);
    });





    var carDirection = 0;
    var keys = {};

    /* our location */
    var currentSection = 0;
    var currentMap = basicmap;
    var lap = 1;


   /* var ctx = signSlip.getContext("2d");
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillRect(0,0, signSlip.width, signSlip.height);*/
    //document.getElementsByTagName("body")[0].appendChild(signSlip);
    //document.getElementsByTagName("body")[0].appendChild(signWarn);
    //document.getElementsByTagName("body")[0].appendChild(greenCar);

    requestAnimationFrame(render);

    document.addEventListener("keyup", function (e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = false;
    });

    document.addEventListener("keydown", function (e) {
        var key = e.key || e.keyIdentifier;
        keys[key] = true;
        if (key == "U+0020") carReverse = !carReverse;
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