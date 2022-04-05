export class LatLngBounds{
    constructor(lat1, lng1, lat2, lng2){
        this.minLat = Math.min(lat1, lat2)
        this.minLng = Math.min(lng1, lng2)
        this.maxLat = Math.max(lat1, lat2)
        this.maxLng = Math.max(lng1, lng2)
    }
    contains(lat, lng){
        return lat >= this.minLat && lat <= this.maxLat && lng >= this.minLng && lng <= this.maxLng
    }
    ll(){
        return [this.minLat, this.minLng]
    }
    ur(){
        return [this.maxLat, this.maxLng]
    }
    lr(){     
        return [this.maxLat, this.minLng]
    }
    ul(){
        return [this.minLat, this.maxLng]
    }
}