const port = process.env.PORT || 3000;
const io = require('socket.io')(port, {
    cors: { origin: "*" } 
});

let players = {};
let foods = [];
const WORLD_RADIUS = 2500;
const MAX_BOTS = 15;
const BOT_NAMES = ["Viper", "Naga", "Kobra", "Striker", "Python", "Shadow", "Neon", "Titan"];

// Initial World Setup
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
            isBoosting: false,
            isBot: false
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

// Main Game Engine Loop
setInterval(() => {
    // 1. Manage Bots
    let currentPlayers = Object.values(players);
    let botCount = currentPlayers.filter(p => p.isBot).length;
    
    if (botCount < MAX_BOTS) {
        let id = "bot_" + Math.random().toString(36).substr(2, 5);
        players[id] = {
            id: id,
            name: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            body: [{x: Math.random() * 5000, y: Math.random() * 5000}],
            length: 40 + Math.random() * 100,
            angle: Math.random() * Math.PI * 2,
            score: 0,
            isBoosting: false,
            isBot: true
        };
    }

    // 2. Update Movements and Collisions
    Object.values(players).forEach(p => {
        let head = p.body[0];
        
        // Bot Intelligence (simple wandering)
        if (p.isBot) {
            p.angle += Math.sin(Date.now() / 1000) * 0.1;
            // Turn away from border
            if (Math.hypot(head.x - 2500, head.y - 2500) > WORLD_RADIUS - 200) {
                p.angle = Math.atan2(2500 - head.y, 2500 - head.x);
            }
        }

        let speed = p.isBoosting && p.length > 30 ? 6.5 : 3.4;
        
        // Boosting cost
        if(p.isBoosting && p.length > 30) {
            p.length -= 0.15;
            p.score = Math.max(0, p.score - 0.5);
        }

        let nextX = head.x + Math.cos(p.angle) * speed;
        let nextY = head.y + Math.sin(p.angle) * speed;

        p.body.unshift({ x: nextX, y: nextY });
        while (p.body.length > Math.floor(p.length)) p.body.pop();

        // Border Kill
        if (Math.hypot(nextX - 2500, nextY - 2500) > WORLD_RADIUS) {
            if (!p.isBot) {
                delete players[p.id]; // Remove player if they hit the edge
            } else {
                p.body = [{x: 2500, y: 2500}]; // Respawn bot
            }
        }

        // Food Collision logic
        for (let i = foods.length - 1; i >= 0; i--) {
            let f = foods[i];
            if (Math.hypot(nextX - f.x, nextY - f.y) < 20) {
                p.length += 2;
                p.score += 10;
                foods.splice(i, 1);
                spawnFood();
            }
        }
    });

    io.emit('update', { players, foods });
}, 1000 / 60);

console.log("Multiplayer Engine Live with Score & Bots");
