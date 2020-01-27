var currentkeys = {};

const KEYCODE_LEFT  = 37;
const KEYCODE_RIGHT = 39;
const KEYCODE_UP    = 38;
const KEYCODE_DOWN  = 40;

const C_LIGHT = 20;

window.onkeyup   = function(e) { currentkeys[e.keyCode] = false; }
window.onkeydown = function(e) { currentkeys[e.keyCode] = true; }

var canvas = document.getElementById("game-canvas");
var ctx = canvas.getContext('2d');

var PIXEL_RATIO = window.devicePixelRatio;
canvas.style.width  = canvas.width  + "px";
canvas.style.height = canvas.height + "px";
canvas.width  *= PIXEL_RATIO;
canvas.height *= PIXEL_RATIO;

var Game = {ctx: ctx, objects: [], gridlines: false, relativity: true, redshift: true};

function gameSetup() {
    var rocket = {};
    rocket.clock     = 0.0;
    rocket.angle     = 0.0;
    rocket.angular_vel = 0.0;
    rocket.direction = [0.0, 1.0];
    rocket.velocity  = [0.0, 0.0];
    rocket.position  = [0.0, 0.0];
    rocket.ssmooth   = 0.98;

    rocket.thrustForce = 1.0;
    rocket.mass        = 1.0;

    rocket.img = new Image();
    rocket.img.src = "sprite-spaceship.png";
    rocket.img2 = new Image();
    rocket.img2.src = "sprite-spaceship_boost.png";
    rocket.img3 = new Image();
    rocket.img3.src = "sprite-spaceship_rev_boost.png";
    rocket.boost = false

    rocket.tick = function(dt) {
        var thrustMod = 0.0;
        if (currentkeys[KEYCODE_UP]) {
            thrustMod -= 1.0;
        }
        if (currentkeys[KEYCODE_DOWN]) {
            thrustMod += 1.0;
        }
        rocket.boost = thrustMod;

        var angular_vel_add = 0.0;
        if (currentkeys[KEYCODE_LEFT]) {
            angular_vel_add += Math.PI/10;
        }
        if (currentkeys[KEYCODE_RIGHT]) {
            angular_vel_add += - Math.PI/10;
        }
        var alpha = 0.98;
        this.angular_vel = alpha*this.angular_vel + (1 - alpha)*angular_vel_add;

        this.angle += this.angular_vel * dt;

        var g = this.gamma();
        accel = thrustMod * this.thrustForce / (this.mass * this.gamma());

        var velnew = [0, 0];
        velnew[0] = this.velocity[0] + (accel * Math.cos(this.angle+Math.PI/2)) * dt;
        velnew[1] = this.velocity[1] + (accel * Math.sin(this.angle+Math.PI/2)) * dt;

        if (velnew[0]*velnew[0] + velnew[1]*velnew[1] < C_LIGHT*C_LIGHT) {
            this.velocity[0] = velnew[0];
            this.velocity[1] = velnew[1];
        }

        this.position[0] = this.position[0] + this.velocity[0] * dt;
        this.position[1] = this.position[1] + this.velocity[1] * dt;
        rocket.clock += dt;

        var cameraOffsetX = -this.position[0] + this.velocity[0]/C_LIGHT*125;
        var cameraOffsetY = -this.position[1] + this.velocity[1]/C_LIGHT*125;
        Game.cameraMatrix = [1.0, 0.0, 0.0, 1.0, cameraOffsetX, cameraOffsetY];
    };

    rocket.draw = function() {
        ctx.save();
        ctx.translate(this.position[0], this.position[1]);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#fff";
        //ctx.fillRect(-50, -50, 100, 100);
        var img;
        if (this.boost > 0) {
            img = this.img3;
        } else if (this.boost < 0) {
            img = this.img2;
        } else {
            img = this.img;
        }
        ctx.drawImage(img, -img.width/2, -img.height/2);
        ctx.restore();
    };

    Game.objects['rocket'] = rocket;

    var clock = {};
    clock.clock    = 0.0;
    clock.position = [50.0, 50.0];
    clock.img      = new Image();
    clock.img.src  = "sprite-clock.png";

    clock.tick = function(dt) {
        this.clock += dt;
        var radius = 120;
        var theta = this.clock / 10;
        this.position = [radius*Math.cos(theta), radius*Math.sin(theta)];
    }

    clock.draw = function() {
        ctx.save();
        ctx.scale(2, 2);
        var o = this.img.width/2;
        ctx.drawImage(this.img, this.position[0]-o, this.position[1]-o);
        
        var timestr = (this.clock/5).toFixed(0);
        ctx.font = '20px courier';
        ctx.textAlign = 'right';
        ctx.fillStyle = "#eee";
        ctx.fillText(timestr, this.position[0]+85-o, this.position[1]+70-o);
        
        ctx.restore();
    }

    Game.objects['clock'] = clock;

    for (var k in Game.objects) {
        // attrs for all game objects
        Game.objects[k].gamma = function() {
            if (!Game.relativity) return 1.0;
            var v_squared = this.velocity[0]*this.velocity[0] +
                            this.velocity[1]*this.velocity[1];
            // naive
            var term = 1 - v_squared / (C_LIGHT*C_LIGHT);
            if (term <= 0) return 1000.0;
            return 1.0 / Math.sqrt(term);
        }
    }
    
    Game.cameraMatrix = [1.0, 0.0, 0.0, 1.0, canvas.width/2, canvas.height/2];
}

function drawRocketRefGridLines() {
    var rpos = Game.objects['rocket'].position;
    var rx = rpos[0], ry = rpos[1];

    var itv = 100;

    ctx.strokeStyle = "#909";
    var w = 1000;
    for (var x = rx - w; x <= rx + w; x += itv) {
        ctx.beginPath();
        ctx.moveTo(x - rx%itv, ry-w);
        ctx.lineTo(x - rx%itv, ry+w);
        ctx.stroke();
    }
    for (var y = ry - w; y <= ry + w; y += itv) {
        ctx.beginPath();
        ctx.moveTo(rx-w, y - ry%itv);
        ctx.lineTo(rx+w, y - ry%itv);
        ctx.stroke();
    }

    // draw origin pt
    ctx.beginPath();
    ctx.arc(0, 0, 25, 0, 2*Math.PI, false);
    ctx.stroke();
}

const Gamma_clr = 0.80;
const IntensityMax_clr = 255;

// https://stackoverflow.com/a/14917481/2498956
function wavelengthToRGB(Wavelength){
    var factor;
    var Red,Green,Blue;

    if((Wavelength >= 380) && (Wavelength<440)){
        Red = -(Wavelength - 440) / (440 - 380);
        Green = 0.0;
        Blue = 1.0;
    }else if((Wavelength >= 440) && (Wavelength<490)){
        Red = 0.0;
        Green = (Wavelength - 440) / (490 - 440);
        Blue = 1.0;
    }else if((Wavelength >= 490) && (Wavelength<510)){
        Red = 0.0;
        Green = 1.0;
        Blue = -(Wavelength - 510) / (510 - 490);
    }else if((Wavelength >= 510) && (Wavelength<580)){
        Red = (Wavelength - 510) / (580 - 510);
        Green = 1.0;
        Blue = 0.0;
    }else if((Wavelength >= 580) && (Wavelength<645)){
        Red = 1.0;
        Green = -(Wavelength - 645) / (645 - 580);
        Blue = 0.0;
    }else if((Wavelength >= 645) && (Wavelength<781)){
        Red = 1.0;
        Green = 0.0;
        Blue = 0.0;
    }else{
        Red = 0.0;
        Green = 0.0;
        Blue = 0.0;
    };

    // Let the intensity fall off near the vision limits

    if((Wavelength >= 380) && (Wavelength<420)){
        factor = 0.3 + 0.7*(Wavelength - 380) / (420 - 380);
    }else if((Wavelength >= 420) && (Wavelength<701)){
        factor = 1.0;
    }else if((Wavelength >= 701) && (Wavelength<781)){
        factor = 0.3 + 0.7*(780 - Wavelength) / (780 - 700);
    }else{
        factor = 0.0;
    };


    // Don't want 0^x = 1 for x <> 0
    var rgb0 = Red==0.0 ? 0 : Math.round(IntensityMax_clr * Math.pow(Red * factor, Gamma_clr));
    var rgb1 = Green==0.0 ? 0 : Math.round(IntensityMax_clr * Math.pow(Green * factor, Gamma_clr));
    var rgb2 = Blue==0.0 ? 0 : Math.round(IntensityMax_clr * Math.pow(Blue * factor, Gamma_clr));

    return [rgb0, rgb1, rgb2];
}

function drawStars() {
    var quadsize = 400;
    var ox = Math.floor(-Game.cameraMatrix[4] / quadsize);
    var oy = Math.floor(-Game.cameraMatrix[5] / quadsize);

    var gamma = Game.objects['rocket'].gamma();

    var rpos = Game.objects['rocket'].position;
    var rx = rpos[0], ry = rpos[1];

    var rvel = Game.objects['rocket'].velocity;
    rvel = [rvel[0], rvel[1]];
    var mag = Math.sqrt(rvel[0]*rvel[0] + rvel[1]*rvel[1]);
    rvel[0] /= (mag + 1e-7);
    rvel[1] /= (mag + 1e-7);

    var beta = mag / C_LIGHT;

    for (var qx = ox-4; qx <= ox+5; qx++) {
        for (var qy = oy-4; qy <= oy+5; qy++) {
            var seed = qx * 100 + qy + 3;
            var nstars = 100;
            for (var n = 0; n < nstars; n++) {
                var r1 = Math.sin(seed++) * 10000;
                r1 = r1 - Math.floor(r1);
                var x = qx*quadsize + r1*quadsize;

                var r2 = Math.sin(seed++) * 10000;
                r2 = r2 - Math.floor(r2);
                var y = qy*quadsize + r2*quadsize;

                var x_rel = x-rx;
                var y_rel = y-ry;

                var dist = Math.sqrt(x_rel*x_rel + y_rel*y_rel);

                if (Game.redshift) {
                    // rvel already normalized
                    var costheta = (x_rel*rvel[0] + y_rel*rvel[1])/dist;

                    var clr = Math.max(Math.floor(255 - costheta*200), 0);

                    var wavelength = 490 * gamma * (1 - beta * costheta);

                    var rgb = wavelengthToRGB(wavelength);

                    ctx.fillStyle = "rgb("+rgb[0]+","+rgb[1]+","+rgb[2]+")";
                } else {
                    var clr = Math.max(Math.floor(200 - dist/10.0), 0);
                    ctx.fillStyle = "rgb("+clr+","+clr+","+clr+")";
                }
                ctx.fillRect(x, y, 5, 5);
            }
        }
    }
}

function drawInfo() {
    ctx.fillStyle = '#777';
    ctx.save();
    var scale = 2;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    
    ctx.fillRect(0, 0, 200, 70);

    ctx.font = '20px courier';
    ctx.fillStyle = '#eee';

    var gammaStr = "𝛾 = " + Game.objects['rocket'].gamma().toFixed(2);
    ctx.fillText(gammaStr, 10, 20);

    var vel = Game.objects['rocket'].velocity;
    var speed = Math.sqrt(vel[0]*vel[0] + vel[1]*vel[1]);
    var betaStr = "β = " + Math.floor(speed / C_LIGHT * 1000) / 1000;
    ctx.fillText(betaStr, 10, 40);

    var time = Game.objects['rocket'].clock / 5;
    var timeStr = "t = " + time.toFixed(0);
    ctx.fillText(timeStr, 10, 60);

    ctx.restore();
}

function gameStep() {
    var cm = Game.cameraMatrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var scale = 1.25;
    ctx.setTransform(1, 0, 0, 1, canvas.width/2, canvas.height/2);
    ctx.transform(scale, 0, 0, scale, 0, 0);
    ctx.transform(cm[0], cm[1], cm[2], cm[3], cm[4], cm[5]);
    
    var gamma = Game.objects['rocket'].gamma();
    for (var k in Game.objects) {
        var dt = 0.1;
        if (k != 'rocket') dt *= gamma;
        Game.objects[k].tick(dt);
    }

    gamma = Game.objects['rocket'].gamma();

    // https://physics.stackexchange.com/a/30168/64994
    ctx.save();
    var vel = Game.objects['rocket'].velocity;
    var velsq = vel[0]*vel[0] + vel[1]*vel[1] + 1e-7; // avoid zero div
    var m11 = (gamma - 1) * (vel[0] * vel[0])/velsq + 1;
    var m12 = (gamma - 1) * (vel[0] * vel[1])/velsq + 0;
    var m21 = m12;
    var m22 = (gamma - 1) * (vel[1] * vel[1])/velsq + 1;
    var det = m11*m22 - m12*m21;

    //ctx.transform(m11, m12, m21, m22, 0, 0);
    var pos = Game.objects['rocket'].position;
    ctx.translate(pos[0], pos[1]);
    ctx.transform(m22/det, -m12/det, -m21/det, m11/det, 0, 0);
    ctx.translate(-pos[0], -pos[1]);
    drawStars();

    for (var k in Game.objects) {
        if (k != 'rocket')
            Game.objects[k].draw();
    }
    ctx.restore();

    if (Game.gridlines) drawRocketRefGridLines();

    Game.objects['rocket'].draw();

    drawInfo();

    window.requestAnimationFrame(gameStep);
}

document.getElementById('opt-gridline').onclick = function(evt) {
    Game.gridlines = this.checked;
}

document.getElementById('opt-relativity').onclick = function(evt) {
    Game.relativity = this.checked;
}

document.getElementById('opt-redshift').onclick = function(evt) {
    Game.redshift = this.checked;
}

gameSetup();
window.requestAnimationFrame(gameStep);
