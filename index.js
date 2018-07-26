const express = require('express');
const socket = require('socket.io');
const {
    performance,
    PerformanceObserver
  } = require('perf_hooks');


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

    add(vector) {
        return new Vector(
            this.x + vector.x,
            this.y + vector.y
        );
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

class Entity {

    constructor() {
        this.normals = [];
        this.projectionExtremes = [];
    }

    calculateNormals() {
        // get the line vector throuhgh arr[x+1] - arr[x]
        // then its normal vector
        this.normals = this.vertices.map((vertex,index,array) => {
            return array[ index + 1 > array.length - 1 ? 0 : index + 1 ].subtract(vertex).normal()
        })
    }

    getProjections(entity) {
        //projections onto entity's normals
        let projectionExtremes = [];
        entity.normals.forEach( (normal)=> {

            let projections = this.vertices.map((vertex)=>{
                return vertex.dotProduct(normal);
            });
            
            projectionExtremes.push({
                min: Math.min(...projections),
                max: Math.max(...projections)
            })

        } )
        return projectionExtremes;
    }
   
}


class Projectile extends Entity {

    /*     
            p1          p4 
    
            p2          p3
    */      

    constructor(p1,p2,p3,p4,angleRadians,ship){
        super();
        this.vertices=[
            p1,p2,p3,p4
        ];
        this.angleRadians = angleRadians;
        this.stop=false;
        this.ship=ship;
        this.timeout = setTimeout(()=>{
            //console.log('time');
            this.delete(ship);
        },5000);
    }

    // @Override not to include opposite normals
    calculateNormals() {
        this.normals = [];
        this.normals.push(this.vertices[1].subtract(this.vertices[0]).normal());
        this.normals.push(this.vertices[2].subtract(this.vertices[1]).normal());
    }


    delete(ship) {
        ship.projectiles.splice(
            ship.projectiles.indexOf(this),1
        );
        clearTimeout(this.timeout);
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
        return Math.pow(ship.center.x - x,2) + 
        Math.pow(ship.center.y - y,2) < 
        Math.pow(100,2);
    }))
    return new Vector(x,y);

}
class Ship extends Entity{

    constructor(socket){
        super();
        this.vertices= [
            new Vector(0,0),
            new Vector(0,0),
            new Vector(0,0)
            
        ];
        this.center= randomSpawnPoint();
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
var io = socket(server,{transports:['websocket']});

io.on('connection', (socket)=>{
    console.log(socket.id + " connected!");
    let ship = new Ship(socket);
    ships.push(ship);
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
    ship.angleRadians = Math.atan2(ship.mousePos.y - ship.center.y, ship.mousePos.x - ship.center.x);
}



function getPoints(ship) {
    let medianToCentroid = 45/3;
    let p1Vect = new Vector(-medianToCentroid,-15);
    let p2Vect = new Vector(-medianToCentroid, 15);
    let p3Vect = new Vector(2*medianToCentroid, 0);
    p1Vect.rotate(ship.angleRadians);
    p2Vect.rotate(ship.angleRadians);
    p3Vect.rotate(ship.angleRadians);
    ship.vertices[0] = ship.center.add(p1Vect);
    ship.vertices[1] = ship.center.add(p2Vect);
    ship.vertices[2] = ship.center.add(p3Vect);
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
        let projCenter = ship.center.add(distVector);
        let p1 = projCenter.add(p1Vect),
            p2 = projCenter.add(p2Vect),
            p3 = projCenter.add(p3Vect),
            p4 = projCenter.add(p4Vect),
            proj = new Projectile(p1,p2,p3,p4,ship.angleRadians,ship)
        ship.projectiles.push(proj);
       
        
        ship.canShoot = false;
        setTimeout(()=>{
            ship.canShoot=true
        }, 300);
}

function isCollisionSAT (poly1, poly2) {
    //console.log('new col');


    //io.emit('normals', normals);
    // At this point we already have all normals and own projection extremes
    // all that's left is to get cross extremes and check for gaps

    //poly1 normal1 all 
    //poly2 normal2 all

    //poly1 onto poly2's normals
    let firstOntoSecond = poly1.getProjections(poly2);
    //poly2 onto poly1's normals
    let secondOntoFirst = poly2.getProjections(poly1);
    //console.log(secondOntoFirst,poly1.projectionExtremes);
    




    for( let i = 0; i< poly1.projectionExtremes.length; i++){
        let projection = poly1.projectionExtremes[i];
        if (secondOntoFirst[i].max < projection.min || projection.max < secondOntoFirst[i].min) {
            // check for gap
            // if gap, no collision, return
            return false;
        }
    }

    for( let i = 0; i< poly2.projectionExtremes.length; i++){
        let projection = poly2.projectionExtremes[i];
        if (firstOntoSecond[i].max < projection.min || projection.max < firstOntoSecond[i].min) {
            // check for gap
            // if gap, no collision, return
            return false;
        }
    };

    
    return true; 
}

function update(){
    
    

    // movement and shooting
    ships.forEach( (ship) => {
        if (ship.dir.up) {
            ship.center.y--;
        }
        if (ship.dir.left) {
            ship.center.x--;
        }
        if (ship.dir.down) {
            ship.center.y++;
        }
        if (ship.dir.right) {
            ship.center.x++;
        }
    
        
        calculateAngle(ship);
        getPoints(ship);
        
        // get ready for collision
        ship.calculateNormals();
        ship.projectionExtremes = ship.getProjections(ship);

        if(ship.shooting && ship.canShoot) shoot(ship);
        ship.projectiles.forEach((proj)=>{
            if (!proj.stop){
                forwardVect = new Vector(3,0);
                forwardVect.rotate(proj.angleRadians);
                proj.vertices[0] = proj.vertices[0].add(forwardVect);
                proj.vertices[1] = proj.vertices[1].add(forwardVect);
                proj.vertices[2] = proj.vertices[2].add(forwardVect);
                proj.vertices[3] = proj.vertices[3].add(forwardVect);

                // get ready for collision
                proj.calculateNormals();
                proj.projectionExtremes = proj.getProjections(proj);
            }
            
        });

        
    })

    // collision detection
    ships.forEach( (ship) => {
        ship.projectiles.forEach((proj)=>{     
            for(let i = 0; i<ships.length; i++){
                let otherShip = ships[i];
                if (isCollisionSAT(proj, otherShip)) {
                    //proj.stop = true; 
                    proj.delete(ship);
                    otherShip.damage();
                    break;
                }
            }
        })
    })
    // not all data from ships should be sent
    // only take what's necessary
    let toSend = [];
    ships.forEach((ship)=>{
        let sending = {
        vertices: ship.vertices,
        projectiles:ship.projectiles.map((proj)=>{
            return {vertices: proj.vertices};
        }),
        color: ship.color
        }
        toSend.push(sending);


    });
    io.emit('update', toSend);
}
var imperfections = [];
var previousTick = performance.now();
var tickLength = 1000/60;
var ups=[];
var actualTicks = 0

function gameLoop() {
   // performance
     now = performance.now();

     var delta = (now - previousTick)/1000;
     var currUps = 1/delta;
     ups.push(currUps);
     if (ups.length === 600) {
        console.log('avg ups', ups.reduce((a,b)=>{return a+=b}) / ups.length);
        ups=[];
     }
     previousTick = now
    update()
    //console.log(performance.now() - now);
     /*imperfections.push((delta-tickLength));
     if (imperfections.length === 600) {
         console.log('avg', imperfections.reduce((a,b)=>{return a+=b}) / imperfections.length);
         imperfections=[];
     }*/





    


}

setInterval(gameLoop,tickLength);

server.listen( process.env.PORT || 4000, ()=>{
    console.log('Listening on port ' + (process.env.port || 4000) )
} );