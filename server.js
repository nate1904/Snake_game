const port = process.env.PORT || 3000;
const io = require('socket.io')(port, {
    cors: { origin: "*" } 
});

let players = {};
let foods = [];
const WORLD_RADIUS = 2500;

// Initial Food
for (let i = 0; i < 300; i++) spawnFood();

function spawnFood() {
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * (WORLD_RADIUS - 50);
    foods.push({
        id: Math.random().toString(36).substr(2, 5),
        x: 2500 + Math.cos(a) * r,
        y: 2500 + Math.sin(a) * r,
        color: `hsl(${Math.random() * 360}, 80%, 60%)`,
        r: 3 + Math.random() * 4
    });
}

io.on('connection', (socket) => {
    socket.on('init', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name || "Guest",
            color: data.color || "#00eeff",
            body: [{x: 2500, y: 2500}],
            length: 40,
            angle: 0,
            score: 0,
            isBoosting: false
        };
    });

    socket.on('move', (data) => {
        if (players[socket.id]) {
            players[socket.id].angle = data.angle;
            players[socket.id].isBoosting = data.boosting;
        }
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// Game Logic Loop (Runs 60 times a second)
setInterval(() => {
    Object.values(players).forEach(p => {
        let head = p.body[0];
        let speed = p.isBoosting && p.length > 30 ? 6.5 : 3.4;
        
        if(p.isBoosting && p.length > 30) p.length -= 0.1;

        let nextX = head.x + Math.cos(p.angle) * speed;
        let nextY = head.y + Math.sin(p.angle) * speed;

        p.body.unshift({ x: nextX, y: nextY });
        while (p.body.length > p.length) p.body.pop();

        // Border Check
        if (Math.hypot(nextX - 2500, nextY - 2500) > WORLD_RADIUS) {
            // In a real game, you'd trigger a kill here
        }

        // Food Collision
        foods.forEach((f, i) => {
            if (Math.hypot(nextX - f.x, nextY - f.y) < 20) {
                p.length += 2;
                p.score += 10;
                foods.splice(i, 1);
                spawnFood();
            }
        });
    });

    io.emit('update', { players, foods });
}, 1000 / 60);

console.log("Multiplayer Engine Live on port " + port);
