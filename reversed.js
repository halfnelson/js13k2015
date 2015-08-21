/**
 * Created by David on 18/08/2015.
 */

var cv = document.getElementById("c");
var c = cv.getContext("2d");
var w = 640;
var h = 480;

var tv = document.createElement("canvas");
var t = tv.getContext("2d");
var tw = w*2;
tv.width = tw;

tv.height = h;



/* setup our two road textures to produce the effect of moving forward */
var roadwidth =1.2/2;
var roadwidthend = 0.04/2;
var sideRoadWidth = 0.05/2;
var lineWidth = 0.02/2;

var r1d,r2d;

function poly(c, color, p) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(p[0], h);
    c.lineTo(p[1], h/2);
    c.lineTo(p[2], h/2);
    c.lineTo(p[3], h);
    c.fill();
}

function drawRoadTexture(c, grassColor, roadColor, sideRoadColor, lineColor) {

    //grass
    c.rect(0,0,tw,h);
    c.fillStyle=grassColor;
    c.fill();

    //road
    var r1 = tw * (1-roadwidth) / 2;
    var r2 = tw * (1-roadwidthend) / 2;
    var r3 = tw - r2;
    var r4 = tw - r1;
    poly(c,roadColor,[r1,r2,r3,r4]);

    var lw = roadwidth*sideRoadWidth* tw;
    var lwe = roadwidthend*sideRoadWidth*tw;


    poly(c,sideRoadColor,[r1,r2,r2 + lwe, r1 + lw]);
    poly(c,sideRoadColor,[r4,r3,r3 - lwe, r4 - lw]);

    var w2 = tw/2;
    var ld = lineWidth * roadwidth * tw;
    var lde = lineWidth * roadwidthend * tw;
    poly(c,lineColor, [w2-ld, w2-lde,w2+lde,w2+ld]);
}


drawRoadTexture(t, "#224400","#314430","white", "white");
var r1 = document.getElementById("r1");
r1.src = tv.toDataURL('image/png');
r1d= t.getImageData(0,0,tw,h);

drawRoadTexture(t, "#325611","#435443","#222","#435443");
var r2 = document.getElementById("r2");
r2.src = tv.toDataURL('image/png');
r2d = t.getImageData(0,0,tw,h);


//calculate our xmaps using an ellipse equation
//where sharpness is the ratio between a and b
//and a = w/2 and b = sharpness*a
//where sharpness of 1 is max right, and max sharpness is a straight line
//and direction = -1 for left turn +1 for right turn

// x = ±(a sqrt(b^2-y^2))/b and b!=0 and a!=0
function calculateXMap(sharpness, direction) {
    var a = w/2;
    var b = sharpness * h/2;
    var xmap = {};
    for (var y = h/2; y > 0; y--) {
       var dx = (a * Math.sqrt(b*b - y*y))/b;

       //change sign based on direction
       dx = dx * direction;
       //get distance from middle line
       dx = dx - w/2;
       xmap[h/2 - y] = dx;
    }
    return xmap;
}

var rightDx = calculateXMap(1,1);
var leftDx = calculateXMap(1,-1);


function calcZ(ys) {
    var cy = 100; //camera height
    var cz = 10; //camera distance from screen
    return -1 * ((cy*cz)/(h/2 - ys));
}

function drawBackground(skycolor) {
    c.rect(0,0,w,h);
    c.fillStyle = skycolor;
    c.fill();
}


var segmentLength =5;
function drawy(ys, zoffset) {

    var z=calcZ(ys)+zoffset;
    var x=rightDx[ys-h/2] || 0;
    if (z < 0) return true;
    if (z > 200) return false;
    var isr1 = Math.floor(z/segmentLength) % 2 == 0;
    var imgd = isr1 ? r1d : r2d;
    c.putImageData(imgd, x-tw/4, 0,0,ys,tw,2);
    return true;
}


function draw3dRoad(zoffset) {
   //start at bottom
   for (var ys = h-1; ys > 0; ys=ys-1) {
      if (!drawy(ys, zoffset)) break;
   }
}
drawBackground("blue");

var off = 0;
var speed = segmentLength/15;
function render(ts) {

    off = off + speed;
    if (off > segmentLength*2) off=0;

    draw3dRoad(off);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);
//draw3dRoad(0)
console.dir(rightDx);
//c.putImageData(r1d,0,0,0,h*3/4,w,h/4);