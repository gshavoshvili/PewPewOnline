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

module.exports = Vector;