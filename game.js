
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const speedDisplay = document.getElementById("speed");
const scoreDisplay = document.getElementById("score");
const timeDisplay = document.getElementById("time");
const overlay = document.getElementById("overlay");
const startButton = document.getElementById("startButton");
const message = document.getElementById("message");

let running = false;
let speed = 0;
let score = 0;
let time = 90;
let playerX = 0;
let distance = 0;
let traffic = [];
let lastTime = 0;
let spawnTimer = 0;

const keys = {
    left: false,
    right: false,
    accelerate: false,
    brake: false
};

let W = 800;
let H = 600;

function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    W = rect.width;
    H = rect.height;

    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resize);
resize();

function roadCurve(z) {
    return (
        Math.sin(z * 0.0008) * 0.65 +
        Math.sin(z * 0.0017) * 0.3
    );
}

function project(y, curve) {
    const horizon = H * 0.34;
    const depth = Math.max(0, (y - horizon) / (H - horizon));

    const roadWidth = W * (0.035 + depth * 0.85);
    const center = W / 2 + curve * W * depth * 0.65;

    return {
        center,
        width: roadWidth,
        depth
    };
}

function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.55);
    sky.addColorStop(0, "#142b50");
    sky.addColorStop(0.7, "#e98b54");
    sky.addColorStop(1, "#f9d38a");

    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // Sol
    ctx.fillStyle = "#ffe8a6";
    ctx.beginPath();
    ctx.arc(W * 0.75, H * 0.23, Math.min(W, H) * 0.055, 0, Math.PI * 2);
    ctx.fill();

    // Montanhas
    ctx.fillStyle = "#344c42";
    ctx.beginPath();
    ctx.moveTo(0, H * 0.43);

    for (let x = 0; x <= W; x += 30) {
        const y = H * 0.34 + Math.sin(x * 0.018) * 30;
        ctx.lineTo(x, y);
    }

    ctx.lineTo(W, H * 0.6);
    ctx.lineTo(0, H * 0.6);
    ctx.fill();
}

function drawRoad() {
    const horizon = H * 0.34;

    const segments = 100;

    for (let i = 0; i < segments; i++) {
        const y1 = horizon + (H - horizon) * i / segments;
        const y2 = horizon + (H - horizon) * (i + 1) / segments;

        const p1 = project(y1, roadCurve(distance + (1 - i / segments) * 1000));
        const p2 = project(y2, roadCurve(distance + (1 - (i + 1) / segments) * 1000));

        const stripe = Math.floor((distance / 150 + i / 3)) % 2;

        ctx.fillStyle = stripe ? "#287b35" : "#226b30";
        ctx.fillRect(0, y1, W, y2 - y1 + 1);

        // Asfalto
        ctx.fillStyle = "#34383b";
        ctx.beginPath();
        ctx.moveTo(p1.center - p1.width, y1);
        ctx.lineTo(p1.center + p1.width, y1);
        ctx.lineTo(p2.center + p2.width, y2);
        ctx.lineTo(p2.center - p2.width, y2);
        ctx.closePath();
        ctx.fill();

        // Faixas laterais
        ctx.strokeStyle = "#f4f4e8";
        ctx.lineWidth = Math.max(1, p2.depth * 7);

        ctx.beginPath();
        ctx.moveTo(p1.center - p1.width * 0.92, y1);
        ctx.lineTo(p2.center - p2.width * 0.92, y2);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(p1.center + p1.width * 0.92, y1);
        ctx.lineTo(p2.center + p2.width * 0.92, y2);
        ctx.stroke();

        // Faixas centrais
        if (Math.floor(distance / 100 + i) % 8 < 4) {
            ctx.strokeStyle = "#f4f0c4";
            ctx.lineWidth = Math.max(1, p2.depth * 5);
            ctx.beginPath();
            ctx.moveTo(p1.center, y1);
            ctx.lineTo(p2.center, y2);
            ctx.stroke();
        }
    }
}

function drawCar(x, y, width, height, color, player = false) {
    ctx.save();
    ctx.translate(x, y);

    // Sombra
    ctx.fillStyle = "#0008";
    ctx.beginPath();
    ctx.ellipse(0, height * 0.42, width * 0.7, height * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rodas
    ctx.fillStyle = "#111";
    ctx.fillRect(-width * 0.55, height * 0.05, width * 0.18, height * 0.36);
    ctx.fillRect(width * 0.37, height * 0.05, width * 0.18, height * 0.36);

    // Carroceria
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(-width * 0.5, height * 0.35);
    ctx.lineTo(-width * 0.4, height * 0.02);
    ctx.lineTo(-width * 0.25, -height * 0.35);
    ctx.lineTo(width * 0.25, -height * 0.35);
    ctx.lineTo(width * 0.4, height * 0.02);
    ctx.lineTo(width * 0.5, height * 0.35);
    ctx.closePath();
    ctx.fill();

    // Vidro
    ctx.fillStyle = player ? "#b9e8e6" : "#a8c7ce";
    ctx.beginPath();
    ctx.moveTo(-width * 0.25, -height * 0.27);
    ctx.lineTo(width * 0.25, -height * 0.27);
    ctx.lineTo(width * 0.32, height * 0.02);
    ctx.lineTo(-width * 0.32, height * 0.02);
    ctx.fill();

    // Lanternas
    ctx.fillStyle = player ? "#ff2929" : "#fff0c2";
    ctx.fillRect(-width * 0.38, height * 0.22, width * 0.2, height * 0.08);
    ctx.fillRect(width * 0.18, height * 0.22, width * 0.2, height * 0.08);

    if (player) {
        ctx.fillStyle = "#00ff91";
        ctx.fillRect(-width * 0.13, height * 0.08, width * 0.26, height * 0.07);
    }

    ctx.restore();
}

function spawnTraffic() {
    const lane = (Math.random() - 0.5) * 1.3;

    traffic.push({
        x: lane,
        z: 0.05,
        color: ["#f4d03f", "#e74c3c", "#3498db", "#eeeeee"][Math.floor(Math.random() * 4)]
    });
}

function drawTraffic() {
    traffic.forEach(car => {
        const y = H * 0.34 + car.z * H * 0.66;
        const p = project(y, roadCurve(distance + (1 - car.z) * 1000));

        const x = p.center + car.x * p.width * 0.8;
        const size = 0.2 + car.z * 0.8;

        drawCar(x, y, 30 * size, 45 * size, car.color);
    });
}

function drawPlayer() {
    const p = project(H * 0.89, roadCurve(distance));

    const x = p.center + playerX * p.width * 0.8;
    const size = Math.min(W / 800, H / 600);

    drawCar(x, H * 0.88, 65 * size, 100 * size, "#00c878", true);
}

function update(dt) {
    if (!running) return;

    if (keys.accelerate) speed += 100 * dt;
    else speed -= 25 * dt;

    if (keys.brake) speed -= 160 * dt;

    speed = Math.max(0, Math.min(260, speed));

    if (keys.left) playerX -= 1.7 * dt;
    if (keys.right) playerX += 1.7 * dt;

    playerX = Math.max(-1.2, Math.min(1.2, playerX));

    const curve = roadCurve(distance);

    if (Math.abs(playerX) > 0.9) {
        speed *= Math.pow(0.98, dt * 60);
    }

    distance += speed * dt * 5;

    score += Math.floor(speed * dt);

    spawnTimer += dt;

    if (spawnTimer > Math.max(0.6, 2 - speed / 180)) {
        spawnTraffic();
        spawnTimer = 0;
    }

    traffic.forEach(car => {
        car.z += speed * dt * 0.00065;

        if (car.z > 0.75 && car.z < 0.88 &&
            Math.abs(car.x - playerX) < 0.24) {

            speed *= 0.65;
            car.z = 1;
            message.textContent = "COLISÃO!";
            setTimeout(() => message.textContent = "", 500);
        }

        if (car.z > 1) {
            score += 500;
        }
    });

    traffic = traffic.filter(car => car.z < 1.1);

    time -= dt;

    if (time <= 0) {
        time = 0;
        endGame();
    }

    speedDisplay.textContent = String(Math.floor(speed)).padStart(3, "0");
    scoreDisplay.textContent = String(score).padStart(6, "0");
    timeDisplay.textContent = Math.ceil(time);
}

function render() {
    ctx.clearRect(0, 0, W, H);

    drawBackground();
    drawRoad();
    drawTraffic();
    drawPlayer();
}

function loop(timestamp) {
    const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.04);
    lastTime = timestamp;

    update(dt);
    render();

    requestAnimationFrame(loop);
}

function startGame() {
    speed = 0;
    score = 0;
    time = 90;
    playerX = 0;
    distance = 0;
    traffic = [];
    spawnTimer = 0;

    message.textContent = "";
    overlay.style.display = "none";
    running = true;
}

function endGame() {
    running = false;

    overlay.style.display = "flex";
    overlay.querySelector("h1").innerHTML = "RACE <span>OVER</span>";
    overlay.querySelector("p").textContent = "SCORE: " + score;
    startButton.textContent = "PLAY AGAIN";
}

startButton.addEventListener("click", startGame);

function bindButton(id, key) {
    const button = document.getElementById(id);

    button.addEventListener("pointerdown", e => {
        e.preventDefault();
        keys[key] = true;
        button.setPointerCapture(e.pointerId);
    });

    const release = () => keys[key] = false;

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
}

bindButton("leftButton", "left");
bindButton("rightButton", "right");
bindButton("accelerateButton", "accelerate");
bindButton("brakeButton", "brake");

window.addEventListener("keydown", e => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
        e.preventDefault();
    }

    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = true;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = true;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.accelerate = true;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.brake = true;
});

window.addEventListener("keyup", e => {
    if (e.key === "ArrowLeft" || e.key.toLowerCase() === "a") keys.left = false;
    if (e.key === "ArrowRight" || e.key.toLowerCase() === "d") keys.right = false;
    if (e.key === "ArrowUp" || e.key.toLowerCase() === "w") keys.accelerate = false;
    if (e.key === "ArrowDown" || e.key.toLowerCase() === "s") keys.brake = false;
});

requestAnimationFrame(loop);
