/**
 * LatLngBounds : Latitude and Longitude Bounds
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 */
export class LatLngBounds {
  constructor(lat1, lng1, lat2, lng2) {
    if (lat1.constructor === LatLng) {
      this.south = Math.min(lat1.lat, lng1.lat);
      this.north = Math.max(lat1.lat, lng1.lat);
      this.west = Math.min(lat1.lng, lng1.lng);
      this.east = Math.max(lat1.lng, lng1.lng);
    } else {
      this.south = Math.min(lat1, lat2);
      this.west = Math.min(lng1, lng2);
      this.north = Math.max(lat1, lat2);
      this.east = Math.max(lng1, lng2);
    }
  }
  contains(lat, lng) {
    return (
      lat >= this.south &&
      lat <= this.north &&
      lng >= this.west &&
      lng <= this.east
    );
  }
  get center() {
    return new LatLng(
      (this.south + this.north) / 2,
      (this.west + this.east) / 2
    );
  }
  get ll() {
      return new LatLng(this.south, this.west)
  }
  get ur() {
    return new LatLng(this.north, this.east);
  }
}

/**
 * LatLng : Latitude and Longitude
 * @param {number} lat
 * @param {number} lng
 */
export class LatLng {
  constructor(lat, lng) {
    this.lat = lat;
    this.lng = lng;
  }
  toString() {
    return `${this.lat}, ${this.lng}`;
  }
}
