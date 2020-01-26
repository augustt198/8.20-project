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

var Game = {ctx: ctx, objects: []};

function gameSetup() {
    var rocket = {};
    rocket.clock     = 0.0;
    rocket.angle = 0.0;
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
    rocket.boost = false

    rocket.tick = function(dt) {
        var thrustMod = 0.0;
        if (currentkeys[KEYCODE_UP]) {
            thrustMod -= 1.0;
        }
        if (currentkeys[KEYCODE_DOWN]) {
            thrustMod += 1.0;
        }
        rocket.boost = (thrustMod != 0.0);

        if (currentkeys[KEYCODE_LEFT]) {
            rocket.angle += Math.PI/20 * dt;
        }
        if (currentkeys[KEYCODE_RIGHT]) {
            rocket.angle -= Math.PI/20 * dt;
        }

        accel = thrustMod * this.thrustForce / (this.mass * this.gamma());

        this.velocity[0] = this.velocity[0] + (accel * Math.cos(this.angle+Math.PI/2)) * dt;
        this.velocity[1] = this.velocity[1] + (accel * Math.sin(this.angle+Math.PI/2)) * dt;

        this.position[0] = this.position[0] + this.velocity[0] * dt;
        this.position[1] = this.position[1] + this.velocity[1] * dt;
        rocket.clock += dt;

        var cameraOffsetX = -this.position[0] + this.velocity[0]/C_LIGHT*75 + canvas.width/2;
        var cameraOffsetY = -this.position[1] + this.velocity[1]/C_LIGHT*75 + canvas.height/2;
        Game.cameraMatrix = [1.0, 0.0, 0.0, 1.0, cameraOffsetX, cameraOffsetY];
    };

    rocket.draw = function() {
        ctx.save();
        ctx.translate(this.position[0], this.position[1]);
        ctx.rotate(this.angle);
        ctx.fillStyle = "#fff";
        //ctx.fillRect(-50, -50, 100, 100);
        var img = this.boost ? this.img2 : this.img;
        ctx.drawImage(img, -img.width/2, -img.height/2);
        ctx.restore();
    };

    Game.objects['rocket'] = rocket;

    for (var k in Game.objects) {
        // attrs for all game objects
        Game.objects[k].gamma = function() {
            var v_squared = this.velocity[0]*this.velocity[0] +
                            this.velocity[1]*this.velocity[1];
            // naive
            var term = 1 - v_squared / (C_LIGHT*C_LIGHT);
            if (term <= 0) return Infinity;
            else return 1.0 / Math.sqrt(term);
        }
    }
    
    Game.cameraMatrix = [1.0, 0.0, 0.0, 1.0, canvas.width/2, canvas.height/2];
}

function drawStars() {
    var quadsize = 400;
    var ox = Math.floor(-Game.cameraMatrix[4] / quadsize);
    var oy = Math.floor(-Game.cameraMatrix[5] / quadsize);

    var rpos = Game.objects['rocket'].position;
    var rx = rpos[0], ry = rpos[1];

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

                var dist = Math.sqrt((rx-x)*(rx-x) + (ry-y)*(ry-y))/10.0;

                var clr = Math.max(Math.floor(200 - dist), 0);

                ctx.fillStyle = "rgb("+clr+","+clr+","+clr+")";
                ctx.fillRect(x, y, 5, 5);
            }
        }
    }
}

function drawInfo() {
    ctx.fillStyle = '#777';
    ctx.save();
    ctx.setTransform(1.5, 0, 0, 1.5, 0, 0);
    
    ctx.fillRect(0, 0, 200, 50);

    ctx.font = '20px courier';
    ctx.fillStyle = '#eee';

    var gammaStr = "𝛾 = " + Game.objects['rocket'].gamma().toFixed(2);
    ctx.fillText(gammaStr, 10, 20);

    var vel = Game.objects['rocket'].velocity;
    var speed = Math.sqrt(vel[0]*vel[0] + vel[1]*vel[1]);
    var betaStr = "β = " + (speed / C_LIGHT).toFixed(3);
    ctx.fillText(betaStr, 10, 40);

    ctx.restore();
}

function gameStep() {
    var cm = Game.cameraMatrix;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.setTransform(cm[0], cm[1], cm[2], cm[3], cm[4], cm[5]);
    ctx.scale(1.25, 1.25);
    
    for (var j = -100; j < 100; j++) {
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.moveTo(-100, j*50);
        ctx.lineTo(100, j*50);
        ctx.stroke();
    }

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
    var velsq = vel[0]*vel[0] + vel[1]*vel[1] + 1e-7;
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
    ctx.restore();

    for (var k in Game.objects) {
        Game.objects[k].draw();
    }

    drawInfo();

    window.requestAnimationFrame(gameStep);
}

gameSetup();
window.requestAnimationFrame(gameStep);
