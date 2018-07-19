const socket = io('http://localhost:4000');
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const DIMENSIONS = {
    width: canvas.width,
    height: canvas.height
}
var DEBUG = false;
let ships = [];
let normals = [];

let hp = 100;

socket.on('update', (newShips)=>{
    ships = newShips;
})
socket.on('normals', newNormals => {
    normals = newNormals;
    console.log('got normals')
})
socket.on('hp',(newHp)=>{
    hp = newHp;
})
document.addEventListener('keydown', (e)=>{
    console.log(e.code);
    switch (e.code) {
        case 'KeyW':  socket.emit('move', 'up');    break;
        case 'KeyA':  socket.emit('move', 'left');  break;
        case 'KeyS':  socket.emit('move', 'down');  break;
        case 'KeyD':  socket.emit('move', 'right'); break;  
    }
});

document.addEventListener('keyup', (e)=>{
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


function drawShip(ship){
    
        ctx.fillStyle = ship.color;
        ctx.beginPath();
        ctx.moveTo(ship.pos.p1.x, ship.pos.p1.y);
        ctx.lineTo(ship.pos.p2.x, ship.pos.p2.y);
        ctx.lineTo(ship.pos.p3.x, ship.pos.p3.y);
        ctx.fill();
    
}

function drawProjectiles(ship){
    ctx.fillStyle="red";
    ship.projectiles.forEach((proj)=>{
        ctx.beginPath();
        ctx.moveTo(proj.p1.x, proj.p1.y);
        ctx.lineTo(proj.p2.x, proj.p2.y);
        ctx.lineTo(proj.p3.x, proj.p3.y);
        ctx.lineTo(proj.p4.x, proj.p4.y);
        ctx.fill();
    })
}

function draw() {
    ctx.clearRect(0, 0, DIMENSIONS.width, DIMENSIONS.height);
    ctx.fillStyle = '#000000'; 
    ctx.fillRect(0, 0, DIMENSIONS.width, DIMENSIONS.height);
    
    ships.forEach((ship)=>{
        drawShip(ship);
        drawProjectiles(ship);
    })
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