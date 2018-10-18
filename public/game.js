const socket = io('/', {transports: ['websocket']});
const canvas = document.getElementById('game');
canvas.focus();
const ctx = canvas.getContext('2d');

const chat = document.getElementById('chat');
const chatMessages = document.querySelector('#chat #messages');
const chatInput = document.querySelector('#chat #input');
const chatForm = document.querySelector('#chat #form');

const DIMENSIONS = {
    width: canvas.width,
    height: canvas.height
}
var DEBUG = false;
let ships = {};
let normals = [];

let hp = 100;

class Ship {
    constructor(initPack) {
        this.id = initPack.id;
        this.vertices = initPack.vertices;
        this.projectiles = {};
        this.color = initPack.color;
        ships[this.id]=this;
    }
    
    delete() {
        delete ships[this.id];
    }
}

class Projectile {
    constructor(initPack) {
        this.id = initPack.id;
        
        this.vertices = initPack.vertices;

        this.ship = ships[initPack.shipId];
        this.ship.projectiles[this.id] = this;
    }

    delete() {
        delete this.ship.projectiles[this.id];
    }
}

function escapeHtml(unsafe) {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }

socket.on('init', (pack) => {
    console.log('init',pack)
    if (pack.ships){
        pack.ships.forEach((shipPack) => {
            new Ship(shipPack);
         })
    }
    
    if (pack.projectiles){
        pack.projectiles.forEach(projPack => {
            new Projectile(projPack);
        })
    }
    
});
socket.on('remove', (toRemove)=> {
    console.log('remove', toRemove)
    if (toRemove.ships){
        toRemove.ships.forEach((id) => {
            ships[id].delete();
         })
    }
    
    if (toRemove.projectiles){
        toRemove.projectiles.forEach((proj) => {
            if(ships[proj.shipId]){
                ships[proj.shipId].projectiles[proj.id].delete();
            }
            
        })
    }
})
socket.on('update', (diffs)=>{
    console.log('diffs', diffs, Date())
    diffs.forEach((diff)=>{
        let ship = ships[diff.id];
        if (ship) {
            if (diff.vertices) {
                ship.vertices = diff.vertices;
            }
            if (diff.projectiles) {
                diff.projectiles.forEach((projChange)=>{
                    let projectile = ship.projectiles[projChange.id];
                    if(projectile) {
                        projectile.vertices = projChange.vertices;
                    }
                })
            }
        } 
    })
});

socket.on('normals', newNormals => {
    normals = newNormals;
    console.log('got normals')
})
socket.on('hp',(newHp)=>{
    hp = newHp;
})
socket.on('chatMessage', (message)=>{
    chatMessages.innerHTML += '<div>' +  escapeHtml(message) + '</div>'
});
socket.on('eval', (result)=>{
    console.log(result);
})

chatForm.onsubmit = (e) => {
    e.preventDefault();
    if (chatInput.value[0] === '/'){
        socket.emit('eval', chatInput.value.slice(1));
    }
    else {
        socket.emit('chatMessage', chatInput.value);
    }
    chatInput.value='';
}
canvas.addEventListener('keydown', (e)=>{
    console.log(e.code);
    switch (e.code) {
        case 'KeyW':  socket.emit('move', 'up');    break;
        case 'KeyA':  socket.emit('move', 'left');  break;
        case 'KeyS':  socket.emit('move', 'down');  break;
        case 'KeyD':  socket.emit('move', 'right'); break;  
    }
});

canvas.addEventListener('keyup', (e)=>{
    console.log(e.code);
    switch (e.code) {
        case 'KeyW':  socket.emit('moveStop', 'up');    break;
        case 'KeyA':  socket.emit('moveStop', 'left');  break;
        case 'KeyS':  socket.emit('moveStop', 'down');  break;
        case 'KeyD':  socket.emit('moveStop', 'right'); break;  
    }
});


canvas.addEventListener('mousemove', (e)=>{
    socket.emit('mouseMove', {x: e.offsetX, y: e.offsetY});
});
canvas.addEventListener('mousedown', (e)=>{
    socket.emit('mousedown');
});
canvas.addEventListener('mouseup', (e)=>{
    socket.emit('mouseup');
});
canvas.addEventListener('mouseleave', (e)=>{
    socket.emit('mouseup');
});


function drawShip(ship){
        ctx.fillStyle = ship.color;
        ctx.beginPath();
        ctx.moveTo(ship.vertices[0].x, ship.vertices[0].y);
        ctx.lineTo(ship.vertices[1].x, ship.vertices[1].y);
        ctx.lineTo(ship.vertices[2].x, ship.vertices[2].y);
        ctx.fill();
    
}

function drawProjectiles(ship){
    
    for (let i in ship.projectiles){
        const proj = ship.projectiles[i];
        ctx.fillStyle=ship.color;
        ctx.beginPath();
        ctx.moveTo(proj.vertices[0].x, proj.vertices[0].y);
        ctx.lineTo(proj.vertices[1].x, proj.vertices[1].y);
        ctx.lineTo(proj.vertices[2].x, proj.vertices[2].y);
        ctx.lineTo(proj.vertices[3].x, proj.vertices[3].y);
        ctx.fill();
    }
}

var fps;
var lastTime;

function draw(time) {
    
    // performance
    let delta = (time - lastTime)/1000;
    fps = 1/delta;
    lastTime=time;

    if(fps<60){
        console.log('drop',fps,Date());
    }
    
    
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, DIMENSIONS.width, DIMENSIONS.height);
    
    ctx.font = "20px Arial";
    ctx.fillStyle='white';
    ctx.fillText('fps: ' + Math.round(fps),10,25);

    for (let i in ships){
        const ship = ships[i];
        drawShip(ship);
        drawProjectiles(ship);
    }

    ctx.strokeStyle='#FFFFFF';
    if(DEBUG){
        normals.forEach((normal,index)=>{
        if(index>1){
            console.log(normal);
            ctx.beginPath();
            ctx.moveTo(ships[0].pos.center.x, ships[0].pos.center.y);
            ctx.lineTo(ships[0].pos.center.x + normal.x, ships[0].pos.center.y + normal.y);
            ctx.stroke();
        }
    })
}
    
    ctx.fillStyle="red";
    ctx.fillRect(480, 10,hp*100/100,25);
    // 22.5 22.5 15 15
    

    


    window.requestAnimationFrame(draw);
}

window.requestAnimationFrame(draw);



