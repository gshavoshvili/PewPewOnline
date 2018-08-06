class Entity {

    constructor(id) {
        this.id = id;
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

    getSingleProjection(normal) {

        let projections = this.vertices.map((vertex)=>{
            return vertex.dotProduct(normal);
        });
        
       return {
            min: Math.min(...projections),
            max: Math.max(...projections)
        };

    }

    getOwnProjections() {
        //projections onto entity's normals
        let projectionExtremes = [];
        this.normals.forEach( (normal)=> {

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

module.exports = Entity;