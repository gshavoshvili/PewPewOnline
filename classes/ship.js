const Vector = require('./vector');
const Entity = require('./entity');


module.exports = function (packs)
{
const Projectile = require('./projectile')(packs);
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



class Ship extends Entity{
    
    get ships() {
        return this.constructor.ships;
    }

    static randomSpawnPoint() {
        let x, y;
        do {
           x = getRandomIntInclusive(0+40,599-40);
           y = getRandomIntInclusive(0+25,599-25);
            
        }
        while(this.ships.some((ship)=>{
            return Math.pow(ship.center.x - x,2) + 
            Math.pow(ship.center.y - y,2) < 
            Math.pow(100,2);
        }))
        return new Vector(x,y);
    
    }

    constructor(socket){
        super(socket.id);
        
        this.center= this.constructor.randomSpawnPoint();
        this.angleRadians=0;
        this.vertices= [
            new Vector(0,0),
            new Vector(0,0),
            new Vector(0,0)
            
        ];
        this.getPoints();
        
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
        this.projectiles=  {};
        this.hp= 100;
        this.color= randomVisibleColor();
        this.socket= socket;
        packs.initPack.ships.push(
            this.getInitPack()
        );
    }

    getProjectileInits() {
        let inits = [];
        for (let i in this.projectiles) {
            let proj = this.projectiles[i];
            inits.push(proj.getInitPack());
        }
        return inits;
    }

    getInitPack() {
        
        return {
            id: this.id,
            vertices: this.vertices,
            projectiles:this.getProjectileInits(),
            color: this.color
        }
            
        
    }

    getPoints() {
        let medianToCentroid = 45/3;
        let p1Vect = new Vector(-medianToCentroid,-15);
        let p2Vect = new Vector(-medianToCentroid, 15);
        let p3Vect = new Vector(2*medianToCentroid, 0);
        p1Vect.rotate(this.angleRadians);
        p2Vect.rotate(this.angleRadians);
        p3Vect.rotate(this.angleRadians);
        this.vertices[0] = this.center.add(p1Vect);
        this.vertices[1] = this.center.add(p2Vect);
        this.vertices[2] = this.center.add(p3Vect);
    }

    damage() {
        this.hp-=20;
        this.socket.emit('hp',this.hp);
        if (this.hp<=0) {
            this.delete();
            this.socket.emit('dead');
        }
        
        
    }

    shoot() {
        let distVector = new Vector(45/3*2 + 20, 0);
            distVector.rotate(this.angleRadians);
          
            let p1Vect = new Vector(-18, -4),
                p2Vect = new Vector(-18, 4),
                p3Vect = new Vector(18, 4),
                p4Vect = new Vector(18,-4);
            p1Vect.rotate(this.angleRadians);
            p2Vect.rotate(this.angleRadians);
            p3Vect.rotate(this.angleRadians);
            p4Vect.rotate(this.angleRadians);
            let projCenter = this.center.add(distVector);
            let p1 = projCenter.add(p1Vect),
                p2 = projCenter.add(p2Vect),
                p3 = projCenter.add(p3Vect),
                p4 = projCenter.add(p4Vect);
                new Projectile(p1,p2,p3,p4,this.angleRadians,this)
           
            
            this.canShoot = false;
            setTimeout(()=>{
                this.canShoot=true
            }, 300);
    }

    delete() {
        if ( this.ships.indexOf(this) > -1 ) {
            packs.removePack.ships.push(this.id);
            this.ships.splice(
                this.ships.indexOf(this),1
            );
            
        }
        
    }

}
Ship.ships = [];

return Ship;
}