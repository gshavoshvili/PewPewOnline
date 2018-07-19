const express = require('express');
const socket = require('socket.io');


class Vector {
    
    constructor (x,y){
        this.x=x;
        this.y=y;
    }

    rotate(angleRadians) {
        let sin = Math.sin(angleRadians);
        let cos = Math.cos(angleRadians);
        let xCopy = this.x;
        this.x = xCopy * cos - this.y * sin;
        this.y = xCopy * sin + this.y * cos;
    }

    dotProduct(vector) {
        //console.log('dot: ', this.x, vector.x,this.y,vector.y );
        return this.x * vector.x + this.y * vector.y;
    }

    subtract(vector) {
        return new Vector(
            this.x - vector.x,
            this.y - vector.y
        );
    }

    normal() {
        return new Vector(
            
            -this.y,
            this.x
        );
    }
}

class Projectile {

    /*     
            p1          p4 
    
            p2          p3
    */      

    constructor(p1,p2,p3,p4,angleRadians){
        this.p1 = p1;
        this.p2 = p2;
        this.p3 = p3;
        this.p4 = p4;
        this.angleRadians = angleRadians;
        this.stop=false;
        
    }

    delete(ship) {
        console.log(ship);
        ship.projectiles.splice(
            ship.projectiles.indexOf(this),1
        );
    }


}

const ships=[];

function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive 
  }

function isBrightEnough (color) {
    return (color[0] * 299 + color[1] * 587 + color[2] * 114) / 1000 > 123;
}

function randomVisibleColor() {
    color = [0,0,0];
    while(!isBrightEnough(color)){
        color[0] = getRandomIntInclusive(0,255);
        color[1] = getRandomIntInclusive(0,255);
        color[2] = getRandomIntInclusive(0,255);
    }
    return `rgb(${color[0]},${color[1]},${color[2]})`;
}

function randomSpawnPoint() {
    let x, y;
    do {
       x = getRandomIntInclusive(0+40,599-40);
       y = getRandomIntInclusive(0+25,599-25);
        
    }
    while(ships.some((ship)=>{
        return Math.pow(ship.pos.center.x - x,2) + 
        Math.pow(ship.pos.center.y - y,2) < 
        Math.pow(100,2);
    }))
    return new Vector(x,y);

}
class Ship {

    constructor(socket){
        this.pos= {
            p1: new Vector(0,0),
            p2: new Vector(0,0),
            p3: new Vector(0,0),
            center : randomSpawnPoint()
            
        };
        this.angleRadians=0;
        this.dir= {
            up: false,
            left: false,
            down: false,
            right: false
        };
        this.mousePos= {
            x:0,
            y:0
        };
        this.shooting= false;
        this.canShoot= true;
        this.projectiles=  [];
        this.hp= 100;
        this.color= randomVisibleColor();
        this.socket= socket;
        
    }

    damage() {
        this.hp-=20;
        this.socket.emit('hp',this.hp);
        if (this.hp<=0) {
            this.delete();
            this.socket.emit('dead');
        }
        
        console.log(this.hp);
        
    }

    delete() {
        if ( ships.indexOf(this) > -1 ) {
            ships.splice(
                ships.indexOf(this),1
            );
        }
    }

}







// App setup

const app = express();

const server = require('http').createServer(app);

// Static files 

app.use(express.static('public'));



// Socket setup
var io = socket(server);

io.on('connection', (socket)=>{
    console.log(socket.id + " connected!");
    let ship = new Ship(socket);
    ships.push(ship);
    socket.emit('pos', ship.pos);
    console.log('sent initial pos to ' + socket.id);
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
}) 

function calculateAngle(ship) {
    ship.angleRadians = Math.atan2(ship.mousePos.y - ship.pos.center.y, ship.mousePos.x - ship.pos.center.x);
}



function getPoints(ship) {
    let medianToCentroid = 45/3;
    let p1Vect = new Vector(-medianToCentroid,-15);
    let p2Vect = new Vector(-medianToCentroid, 15);
    let p3Vect = new Vector(2*medianToCentroid, 0);
    p1Vect.rotate(ship.angleRadians);
    p2Vect.rotate(ship.angleRadians);
    p3Vect.rotate(ship.angleRadians);

    ship.pos.p1.x = ship.pos.center.x  + p1Vect.x ;
    ship.pos.p1.y = ship.pos.center.y  + p1Vect.y ;

    ship.pos.p2.x = ship.pos.center.x + p2Vect.x;
    ship.pos.p2.y = ship.pos.center.y + p2Vect.y;

    ship.pos.p3.x = ship.pos.center.x + p3Vect.x;
    ship.pos.p3.y = ship.pos.center.y + p3Vect.y;
}



function shoot(ship){
    let distVector = new Vector(45/3*2 + 20, 0);
        distVector.rotate(ship.angleRadians);
      
        let p1Vect = new Vector(-18, -4),
            p2Vect = new Vector(-18, 4),
            p3Vect = new Vector(18, 4),
            p4Vect = new Vector(18,-4);
        p1Vect.rotate(ship.angleRadians);
        p2Vect.rotate(ship.angleRadians);
        p3Vect.rotate(ship.angleRadians);
        p4Vect.rotate(ship.angleRadians);
        
        let p1 = new Vector (
            ship.pos.center.x + distVector.x + p1Vect.x,
            ship.pos.center.y + distVector.y + p1Vect.y
        )
        let p2 = new Vector(
            ship.pos.center.x + distVector.x + p2Vect.x,
            ship.pos.center.y + distVector.y + p2Vect.y
        )
        let p3 = new Vector(
            ship.pos.center.x + distVector.x + p3Vect.x,
            ship.pos.center.y + distVector.y + p3Vect.y
        )
        let p4 = new Vector(
            ship.pos.center.x + distVector.x + p4Vect.x,
            ship.pos.center.y + distVector.y + p4Vect.y
        )
        let proj = new Projectile(p1,p2,p3,p4,ship.angleRadians)
        ship.projectiles.push(proj);
        setTimeout(()=>{
            proj.delete(ship);
        },5000);
        
        ship.canShoot = false;
        setTimeout(()=>{
            ship.canShoot=true
        }, 300);
}

function isCollisionSAT (poly1, poly2) {
    //console.log('new col');
    // get all unique normals
    const normals = [];
    
    // rect normals
    normals.push(poly1.p2.subtract(poly1.p1).normal());
    normals.push(poly1.p3.subtract(poly1.p2).normal());

    // triangle normals
    normals.push(poly2.p2.subtract(poly2.p1).normal());
    normals.push(poly2.p3.subtract(poly2.p2).normal());
    normals.push(poly2.p1.subtract(poly2.p3).normal());


    io.emit('normals', normals);

    for (let i = 0; i<normals.length; i++){
        normal = normals[i];
        // get min max projections
        let projections1 = [];
        
        projections1.push(poly1.p1.dotProduct(normal));
        projections1.push(poly1.p2.dotProduct(normal));
        projections1.push(poly1.p3.dotProduct(normal));
        projections1.push(poly1.p4.dotProduct(normal));

        let projections2 = [];
        projections2.push(poly2.p1.dotProduct(normal));
        projections2.push(poly2.p2.dotProduct(normal));
        projections2.push(poly2.p3.dotProduct(normal));

        let max1 = Math.max(...projections1);
        let min1 = Math.min(...projections1);

        let max2 = Math.max(...projections2);
        let min2 = Math.min(...projections2);
        //console.log(max2,min1,max1,min2);
        // check for gap
        // if gap, no collision, return
        if (max2 < min1 || max1 < min2) {
            
            return false;
        }
        
    }
    
    
    return true; 
}

function update(){
    ships.forEach( (ship) => {
        if (ship.dir.up) {
            ship.pos.center.y--;
        }
        if (ship.dir.left) {
            ship.pos.center.x--;
        }
        if (ship.dir.down) {
            ship.pos.center.y++;
        }
        if (ship.dir.right) {
            ship.pos.center.x++;
        }
    
        
        calculateAngle(ship);
        getPoints(ship);
        if(ship.shooting && ship.canShoot) shoot(ship);
        ship.projectiles.forEach((proj)=>{
            if (!proj.stop){
                forwardVect = new Vector(3,0);
                forwardVect.rotate(proj.angleRadians);
                proj.p1.x += forwardVect.x;
                proj.p1.y += forwardVect.y;
                proj.p2.x += forwardVect.x;
                proj.p2.y += forwardVect.y;
                proj.p3.x += forwardVect.x;
                proj.p3.y += forwardVect.y;
                proj.p4.x += forwardVect.x;
                proj.p4.y += forwardVect.y;
                
                //todo separate
                for(let i = 0; i<ships.length; i++){
                    let otherShip = ships[i];
                    if (isCollisionSAT(proj, otherShip.pos)) {
                        //proj.stop = true; 
                        //console.log(ships.indexOf(ship));
                        proj.delete(ship);
                        otherShip.damage();
                        break;
                    }
                }
            }
            
        });

        // not all data from ships should be sent
        // only take what's necessary
        let toSend = [];
        ships.forEach((ship)=>{
            let sending = {
            pos: ship.pos,
            projectiles:ship.projectiles,
            color: ship.color
            }
            toSend.push(sending);


        });
        io.emit('update', toSend);
    })

}

setInterval(update,1000/60);

server.listen( process.env.PORT || 4000, ()=>{
    console.log('Listening on port ' + (process.env.port || 4000) )
} );