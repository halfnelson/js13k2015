/**
 * Created by David on 18/08/2015.
 */

var cv = document.getElementById("c");
var c = cv.getContext("2d");
var w = 640;
var h = 480;
var roadwidth =1.2;
var roadwidthend = 0.04;
var sideRoadWidth = 0.05;
var lineWidth = 0.02;

var r1d,r2d;

function poly(c, color, p) {
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(p[0], h);
    c.lineTo(p[1], 0);
    c.lineTo(p[2], 0);
    c.lineTo(p[3], h);
    c.fill();
}

function drawRoadTexture(c, grassColor, roadColor, sideRoadColor, lineColor) {
    //grass
    c.rect(0,0,w,h);
    c.fillStyle=grassColor;
    c.fill();

    //road
    var r1 = w * (1-roadwidth) / 2;
    var r2 = w * (1-roadwidthend) / 2;
    var r3 = w - r2;
    var r4 = w - r1;
    poly(c,roadColor,[r1,r2,r3,r4]);

    var lw = roadwidth*sideRoadWidth*w;
    var lwe = roadwidthend*sideRoadWidth*w;


    poly(c,sideRoadColor,[r1,r2,r2 + lwe, r1 + lw]);
    poly(c,sideRoadColor,[r4,r3,r3 - lwe, r4 - lw]);

    var w2 = w/2;
    var ld = lineWidth * roadwidth * w  /2;
    var lde = lineWidth * roadwidthend * w /2;
    poly(c,lineColor, [w2-ld, w2-lde,w2+lde,w2+ld]);
}

drawRoadTexture(c, "#224400","#314430","white", "white");
var r1 = document.getElementById("r1");
r1.src = cv.toDataURL('image/png');
r1d= c.getImageData(0,0,w,h);

drawRoadTexture(c, "#325611","#435443","#222","#435443");
var r2 = document.getElementById("r2");
r2.src = cv.toDataURL('image/png');
r2d = c.getImageData(0,0,w,h);

function drawBackground(skycolor) {
    c.rect(0,0,w,h);
    c.fillStyle = skycolor;
    c.fill();
}
//var zbuffer = [];
var camHeight = 0.70;
function calcZ(ys) {
    var y = (h-ys)/2;

    var ycam = (camHeight * h);
    if (y == h/2) return -1;
   var z = -1000*ycam /(y - (h/2));
   // var z = -1* y / (ycam - y);
    return z;
}

var segmentLength =2050;
function drawy(ys, zoffset) {

    var z=calcZ(ys)+zoffset;
    if (z < 0) return;
    var isr1 = Math.floor(z/segmentLength) % 2 == 0;
    var imgd = isr1 ? r1d : r2d;
    c.putImageData(imgd,0,(h-ys)*(camHeight ),0,ys,w,2);
}


function draw3dRoad(zoffset) {
   //start at bottom
   for (var ys = 0; ys < h-1; ys=ys+1) {
      drawy(ys, zoffset);
   }
}
drawBackground("blue");

var off = 0;
var speed = segmentLength/20;
function render(ts) {

    off = off + speed;
    if (off > segmentLength*2) off=0;

    draw3dRoad(off);
    requestAnimationFrame(render);
}

requestAnimationFrame(render);

//c.putImageData(r1d,0,0,0,h*3/4,w,h/4);