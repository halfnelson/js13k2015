/**
 * Created by David on 18/08/2015.
 */

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
    var te = thickness*roadwidthend*tw;
    var t = thickness*roadwidth*tw;
    var r1 = tw/2 + (roadpos*roadwidth*tw - t/2);
    var r2 = tw/2 + (roadpos*roadwidthend*tw - te/2);
    var r3 = r2 + te;
    var r4 = r1+t;
    poly(c,color, [r1,r2,r3,r4]);
}

function drawRoadTexture( grassColor, roadColor, sideRoadColor, lineColor) {
    var cv = document.createElement("canvas");
    cv.width = tw;
    cv.height = h;
    var c = cv.getContext("2d");

    //grass
    c.rect(0,0,tw,h);
    c.fillStyle=grassColor;
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

function calcZMap() {
    var zmap = [];
    for (var y = horizon; y > 0; y--) {
        zmap.push((cy*cz)/y);
    }
    return zmap;
}

//calculate our xmaps using an ellipse equation
//where sharpness of 1 is max right, and 0 sharpness is a straight line
//and direction = -1 for left turn +1 for right turn
// x = ±(a sqrt(b^2-y^2))/b and b!=0 and a!=0
function calculateXMap(sharpness, direction) {
    var a =  w/2*sharpness;
    var b = horizon;
    var xmap = [];
    for (var y = 0 ; y < horizon; y++) {
       xmap.push(((a * Math.sqrt(b*b - y*y))/b)*direction - a);
    }
    xmap[0] = 0;
    return xmap;
}

function calculateMaps(){
    zmap = calcZMap();
    rightDx = calculateXMap(1, 1);
    leftDx = calculateXMap(1, -1);
    rightDx = adjustcurveperspective(rightDx);
    leftDx = adjustcurveperspective(leftDx);
}


function adjustcurveperspective(curve) {
    var newcurve = [];
    for (var i=0; i < horizon;  i++) {
        newcurve.push((i*i/(horizon*horizon)) *curve[i]);
    }
    return newcurve;
}



function drawBackground(skycolor) {
    c.rect(0,0,w,h);
    c.fillStyle = skycolor;
    c.fill();
}

function drawStrip(ys, zoffset) {
    var z=(zmap[ys] || -1)+zoffset;


    //TODO this should be based on the current part of the map, not hardcoded rightDx[ys]
    var x= (1-(ys/horizon))*vx// + (rightDx[ys] || 0);

    if (z < 0) return true;
    if (z > 80) return false;

    //TODO hills

    var isr1 = Math.floor(z/segmentLength) % 2 == 0;
    var imgd = isr1 ? road1 : road2;



    c.beginPath();
    c.drawImage(imgd,tw/2 - w/2 + x,(h-ys),w, 1, 0,(h-ys), w, 1);
    return true;
}

function draw3dRoad(zoffset) {
   //start at bottom
   for (var ys = 0; ys < horizon; ys=ys+1) {
      if (!drawStrip(ys, zoffset)) break;
   }
}

function render(ts) {
    off = off +vy;
    if (off > segmentLength*2) off = off - segmentLength*2;
    drawBackground("blue");
    draw3dRoad(off);
    requestAnimationFrame(render);
}



/*
 * Main
 */

//canvas
var cv = document.getElementById("c");
var c = cv.getContext("2d");
var w = 640;
var h = 400;
cv.width=w;
cv.height=h;

c.translate(0.5, 0.5); //free aa :)
//road texture width
var tw = w*3;


var vx= 0; //vehicle offset from center
var vy = 0; //vehicle speed

var off = 0; //offset into track
var segmentLength =5;

var cy = 50; //world camera height
var cz = 8; //world camera distance from screen

//offsets
var horizon = h/2;
var zmap, rightDx, leftDx;
calculateMaps();


/* setup our two road textures to produce the effect of moving forward */
var roadwidth =1.5 /3;
var roadwidthend = 0.04/3;
var sideRoadWidth = 0.05/2;
var lineWidth = 0.015;

var road1 = drawRoadTexture("#224400","#314430","white", "white");

var road2 = drawRoadTexture( "#325611","#435443","#224400","#435443");




requestAnimationFrame(render);


document.addEventListener("keydown",function(e) {

    //TODO set flags for render loop instead of doing logic here.
    var key= e.keyIdentifier;
    if (key=="Right") { vx = vx + 10 }
    if (key=="Left") { vx = vx - 10 }
    if (key=="Up") {
        if (vy <= segmentLength) {
            vy = vy + 0.02
        }
    }
    if (key=="Down") {
        if (vy >= 0.02) {
            vy = vy - 0.02
        }
    }
    e.preventDefault();
    return false;
});


/*
 * Debug
 */

function applyChanges() {
     cz = document.getElementById("cz").value;
     cy = document.getElementById("cy").value;
    calculateMaps();

}
/* show road
var r2 = document.createElement("img");
r2.src = tv2.toDataURL('image/png');

//r2.src = tv.toDataURL('image/png');
r2d = t2.getImageData(0,0,tw,h);
*/