const Entity = require('./entity');
module.exports = function (packs) {

class Projectile extends Entity {
    
    /*     
            p1          p4 
    
            p2          p3
    */      
    static* createId(){
        let id = 0;
        while(true){
            yield id++;
        }
    }

    get idGenerator() {
        return this.constructor.idGenerator;
    }


    constructor(p1,p2,p3,p4,angleRadians,ship){
        super(Projectile.idGenerator.next().value);
        this.vertices=[
            p1,p2,p3,p4
        ];
        this.angleRadians = angleRadians;
        this.stop=false;
        this.ship=ship;
        this.timeout = setTimeout(()=>{
            //console.log('time');
            this.delete();
        },5000);

        ship.projectiles[this.id] = this;
        packs.initPack.projectiles.push(
            this.getInitPack()
        );
    }

    getInitPack() {
        return {
            shipId: this.ship.id,
            id: this.id,
            vertices: this.vertices,

        }
    }

    // @Override not to include opposite normals
    calculateNormals() {
        this.normals = [];
        this.normals.push(this.vertices[1].subtract(this.vertices[0]).normal());
        this.normals.push(this.vertices[2].subtract(this.vertices[1]).normal());
    }


    delete() {
        packs.removePack.projectiles.push({
            id: this.id,
            shipId: this.ship.id
        });
        clearTimeout(this.timeout);
        delete this.ship.projectiles[this.id];
        
        
    }


}
Projectile.idGenerator = Projectile.createId();
return Projectile;
}
