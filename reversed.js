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

    function drawRoadTexture(grassColor, roadColor, sideRoadColor, lineColor) {
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

    function whenLoaded(image, callback) {
        if (image.naturalWidth != 0) {
            callback();
        } else {
            image.addEventListener("load", callback);
        }
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

    function calculateMaps() {
        zmap = calcZMap();
        rightDx = calculateXMap(1, 1);
        leftDx = calculateXMap(1, -1);

    }


    function adjustcurveperspective(curve) {
        var newcurve = [];
        for (var i = 0; i < horizon; i++) {
            newcurve.push((i * i * i * i/ (horizon * horizon* horizon*horizon)) * curve[i]);
        }
        return newcurve;
    }


    function drawBackground(skycolor) {
        c.rect(0, 0, w, h);
        c.fillStyle = skycolor;
        c.fill();
    }



    function draw3dRoad(zoffset) {
        var yoff = 0;
        var xoff = 0;
        var lastdx = 0;
        var dx = 0;
        var lastSec = currentSection;
        var changeover = false;
        var lastx = 0;
        //road pass
        for (var ys = 0; ys < horizon; ys = ys + 1) {
            var z = (zmap[ys] || -1) + zoffset;
            if (z-zoffset > 80) break;
            var x = 0;
            //TODO this should be based on the current part of the map, not hardcoded rightDx[ys]
            //get our section for this y
            var sec = sectionFromOffset(z);
            if (sec != lastSec) {
                yoff = ys;
                xoff = lastx;
                dx = lastdx;
                lastSec = sec;
                changeover = ys;
            }

            //(1 - (ys / horizon)) * vx ensures that when the road moves left and right, the vanishing point remains the same
            if (!yoff) {
                x = (1 - (ys / horizon)) * vx;
            }

            var cornertype = currentMap[sec][0];

            x = x + (cornerTypes[cornertype][Math.floor(((ys-yoff)/(horizon-yoff) * horizon))] || 0) + xoff + (ys-yoff)*dx;
           // x = x + (cornerTypes[cornertype][ys-yoff] || 0) + xoff + (ys-yoff)*dx;

            if (z < 0) continue;


            //TODO hills

            var isr1 = Math.floor(z / segmentLength) % 2 == 0;
            var imgd = isr1 ? road1 : road2;

            c.beginPath();
            c.drawImage(imgd, tw / 2 - w / 2 + x, (h - ys), w, 1, 0, (h - ys), w, 1);
            lastdx = x - lastx;
            lastx =x;

        }
        if (false) {
            c.beginPath();
            c.moveTo(0,0);
            c.fillStyle = "red";
            c.lineWidth = 5;
            c.fillRect(0,0,20,(h - changeover) );
          //  if (ys - yoff > 20) vy = 0.04;
           // console.log(ys - yoff);
        }

    }

    function drawCar() {
        var carimg = carstraight;
        if (carDirection == -1) carimg = carturnleft;
        if (carDirection == 1) carimg = carturnright;
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
        vx = vx - pulldir*carturnspeed * (vy*vy / maxvy*maxvy);
        if (vx > w ) vx = w;
        if (vx < -1*w) vx = -1*w;
    }

    function render(ts) {
        processInput();

        move();

        drawBackground("blue");
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
            if (vy > 0) {
                vy = vy - caracceleration;
                if (vy < 0) vy = 0;
            }
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

    var cy = 50; //world camera height
    var cz = 8; //world camera distance from screen

//offsets
    var horizon = h / 2;
    var zmap, rightDx, leftDx;
    calculateMaps();

//map
    //map [[ corner type, number of segments ]]
    // 0 is straight, -1 = left, 1 = right

    var cornerTypes = {};
    cornerTypes[-1] = leftDx;
    cornerTypes[-0.5] =calculateXMap(0.5, -1);
    cornerTypes[1] = rightDx;
    cornerTypes[0] = []; for (var i = 0; i < horizon; i++) { cornerTypes[0][i] = 0;}


    var basicmap = [
        [0,50],
        [-0.5,15],
        [-1,50],
        [0,50],
        [1, 50]
    ];



    /* setup our two road textures to produce the effect of moving forward */
    var roadwidth = 1.5 / 3;
    var roadwidthend = 0.04 / 3;
    var sideRoadWidth = 0.05 / 2;
    var lineWidth = 0.015;

    var road1 = drawRoadTexture("#224400", "#314430", "white", "white");
    var road2 = drawRoadTexture("#325611", "#435443", "#314430", "#435443");


    /* setup our car */
    var carturnspeed = 10;
    var caracceleration = 0.005;
    var carTopSpeedDisplay = 160;
    var carstraight = $("cr");
    var carturnright = $("crt");
    whenLoaded(carturnright, function () {
        carturnleft = flipImage(carturnright)
    });
    var carDirection = 0;
    var keys = {};

    /* our location */
    var currentSection = 0;
    var currentMap = basicmap;
    var lap = 1;


    requestAnimationFrame(render);

    document.addEventListener("keyup", function (e) {
        var key = e.keyIdentifier;
        keys[key] = false;
    });

    document.addEventListener("keydown", function (e) {
        var key = e.keyIdentifier;
        keys[key] = true;
        e.preventDefault();
        return false;
    });


    /* show road
     var r2 = document.createElement("img");
     r2.src = tv2.toDataURL('image/png');

     //r2.src = tv.toDataURL('image/png');
     r2d = t2.getImageData(0,0,tw,h);
     */
}
game();