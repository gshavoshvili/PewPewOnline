const express = require('express');
const socket = require('socket.io');
const util = require('util')
const Vector = require('./classes/vector');
const {
    performance,
    PerformanceObserver
  } = require('perf_hooks');


let packs = {
}

const Ship = require('./classes/ship')(packs);



// App setup

const app = express();

const server = require('http').createServer(app);

// Static files 

app.use(express.static('public'));



// Socket setup
const DEBUG = false;

var io = socket(server,{transports:['websocket']});

io.on('connection', (socket)=>{
    console.log(socket.id + " connected!");
    let ship = new Ship(socket);
    Ship.ships.push(ship);
    socket.on('move', (move)=>{
       
        switch (move) {
            case 'up': ship.dir.up = true; break;
            case 'left': ship.dir.left = true; break;
            case 'down': ship.dir.down=true; break;
            case 'right': ship.dir.right=true; break;
        }
 
    })

    socket.on('moveStop', (move)=>{
       
        switch (move) {
            case 'up': ship.dir.up = false; break;
            case 'left': ship.dir.left = false; break;
            case 'down': ship.dir.down=false; break;
            case 'right': ship.dir.right=false; break;
        }
 
    });

    socket.on('mouseMove', (newMousePos)=>{
        ship.mousePos=newMousePos;
        
        

    });

    socket.on('mousedown', ()=>{
        ship.shooting = true;
    });
    socket.on('mouseup', ()=>{
        ship.shooting = false;
    });

    socket.on('disconnect', () => {
        ship.delete();
      });
    socket.on('chatMessage', (message)=>{
        var playerName = socket.id;
        io.emit('chatMessage',playerName + ': ' + message)
    });
    socket.on('eval', (command)=>{
        if(!DEBUG) {
            return;
        }
        var res = eval(command);
        socket.emit('eval',util.inspect(res,{depth: 5}));
    });

    // Each ship comes with its projectiles
    // No need to send them separately
    let initPack = {
        ships: Ship.ships.map((ship) => {
            return ship.getInitPack();
        })
        
    };
    socket.emit('init', initPack)

}) 

function calculateAngle(ship) {
    ship.angleRadians = Math.atan2(ship.mousePos.y - ship.center.y, ship.mousePos.x - ship.center.x);
}








function isCollisionSAT (poly1, poly2) {
    //console.log('new col');


    //io.emit('normals', normals);

    // At this point we already have all normals and own projection extremes
    // all that's left is to get cross extremes and check for gaps

    
    // projections onto poly1's normals
    for( let i = 0; i< poly1.normals.length; i++){
        let projection1 = poly1.projectionExtremes[i]; 
        let projection2 = poly2.getSingleProjection(poly1.normals[i]);
        if (projection2.max < projection1.min || projection1.max < projection2.min) {
            // check for gap
            // if gap, no collision, return
            return false;
        }
    }

    // projections onto poly2's normals
    for( let i = 0; i< poly2.normals.length; i++){
        let projection2 = poly2.projectionExtremes[i]; 
        let projection1 = poly1.getSingleProjection(poly2.normals[i]);
        if (projection2.max < projection1.min || projection1.max < projection2.min) {
            // check for gap
            // if gap, no collision, return
            return false;
        }
    }

    
    return true; 
}
// can be changed outside of update, initialize here and reset on update end
packs.initPack = {
    ships: [],
    projectiles:[]
}
packs.removePack = {
    ships: [],
    projectiles: []
}; 
function update(){
    
    packs.updatePack= [];
    
    

    // movement and shooting
    Ship.ships.forEach( (ship) => {
        let shouldSend = false;
        let moved = false;

        if (ship.dir.up) {
            ship.center.y--;
            moved = true;
        }
        if (ship.dir.left) {
            ship.center.x--;
            moved = true;
        }
        if (ship.dir.down) {
            ship.center.y++;
            moved = true;
        }
        if (ship.dir.right) {
            ship.center.x++;
            moved = true;
        }
    
        let prevAngle = ship.angleRadians;
        calculateAngle(ship);
        if(ship.angleRadians != prevAngle) {
            moved = true;
        }
        
        if(moved) {
            ship.getPoints();
            shouldSend = true;
        }
        
        // get ready for collision
        ship.calculateNormals();
        ship.projectionExtremes = ship.getOwnProjections();
        if(ship.shooting && ship.canShoot) ship.shoot();
        projPack = [];
        for (let i in ship.projectiles) {
            const proj = ship.projectiles[i];
            if (!proj.stop){
                forwardVect = new Vector(3,0);
                forwardVect.rotate(proj.angleRadians);
                proj.vertices[0] = proj.vertices[0].add(forwardVect);
                proj.vertices[1] = proj.vertices[1].add(forwardVect);
                proj.vertices[2] = proj.vertices[2].add(forwardVect);
                proj.vertices[3] = proj.vertices[3].add(forwardVect);
                projPack.push({
                    id: proj.id,
                    vertices: proj.vertices
                })
                // get ready for collision
                proj.calculateNormals();
                proj.projectionExtremes = proj.getOwnProjections();
            }
        }
        if(projPack.length > 0) {
            shouldSend = true;
        }
        if (shouldSend) {
            packs.updatePack.push({
                id: ship.id,
                vertices: moved?ship.vertices:null,
                projectiles: projPack.length > 0 ? projPack : null  
            })
        }
       
        
    })

    // collision detection
    Ship.ships.forEach( (ship) => {
        
        for (let i in ship.projectiles){
            const proj = ship.projectiles[i];     
            for(let i = 0; i<Ship.ships.length; i++){
                let otherShip = Ship.ships[i];
                if (isCollisionSAT(proj, otherShip)) {
                    //proj.stop = true; 
                    
                    otherShip.damage();
                    proj.delete(ship);
                    break;
                }
            }
        }
    })
    // not all data from Ship.ships should be sent
    // only take what's necessary
    let toSend = [];
    /*Ship.ships.forEach((ship)=>{
        let sending = {
        vertices: ship.vertices,
        projectiles:ship.projectiles.map((proj)=>{
            return {vertices: proj.vertices};
        }),
        color: ship.color
        }
        toSend.push(sending);


    });
    io.emit('update', toSend);*/
    if(packs.removePack.ships.length > 0 || packs.removePack.projectiles.length > 0) {
        //console.log('sent remove pack');
        io.emit('remove',packs.removePack);
        packs.removePack = {
            ships: [],
            projectiles: []
        }; 
    }

    if(packs.initPack.ships.length > 0 || packs.initPack.projectiles.length > 0) {
        //console.log('sent regular init');
        io.emit('init',packs.initPack);
        packs.initPack = {
            ships: [],
            projectiles:[]
        }
    }

    if(packs.updatePack.length > 0) {
        io.emit('update',packs.updatePack);
    }

    
    
}
var imperfections = [];
var previousTick = performance.now();
var tickLength = 1000/60;
var ups=[];
var actualTicks = 0

function gameLoop() {
  
   //setTimeout(gameLoop,tickLength);
     
   now = performance.now();
   var delta = (now - previousTick);
   var currUps = 1/delta;
   //actualTicks++;
   
   if (delta >= tickLength) {
    previousTick = now
    ups.push(currUps*1000);
    if (ups.length === 600) {
       console.log('avg ups', ups.reduce((a,b)=>{return a+=b}) / ups.length);
       ups=[];
    }
        update();
        //console.log('ticks: ',actualTicks);
        //actualTicks=0;
   }  
   
    if ( performance.now() - previousTick < tickLength-4 )
    {setTimeout(gameLoop);}
    
    else {
        setImmediate(gameLoop);
    } 
   
    
     
     //now = performance.now();
    //update()
     // performance
    
     //console.log(performance.now()-now);
    //console.log(performance.now() - now);
     /*imperfections.push((delta-tickLength));
     if (imperfections.length === 600) {
         console.log('avg', imperfections.reduce((a,b)=>{return a+=b}) / imperfections.length);
         imperfections=[];
     }*/





    


}

gameLoop();

server.listen( process.env.PORT || 4000, ()=>{
    console.log('Listening on port ' + (process.env.port || 4000) )
} );