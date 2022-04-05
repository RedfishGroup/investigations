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
      this.minLat = Math.min(lat1.lat, lng1.lat);
      this.maxLat = Math.max(lat1.lat, lng1.lat);
      this.minLng = Math.min(lat1.lng, lng1.lng);
      this.maxLng = Math.max(lat1.lng, lng1.lng);
    } else {
      this.minLat = Math.min(lat1, lat2);
      this.minLng = Math.min(lng1, lng2);
      this.maxLat = Math.max(lat1, lat2);
      this.maxLng = Math.max(lng1, lng2);
    }
  }
  contains(lat, lng) {
    return (
      lat >= this.minLat &&
      lat <= this.maxLat &&
      lng >= this.minLng &&
      lng <= this.maxLng
    );
  }
  get south() {
    return this.minLat;
  }
  get north() {
    return this.maxLat;
  }
  get west() {
    return this.minLng;
  }
  get east() {
    return this.maxLng;
  }
  get center() {
    return new LatLng(
      (this.minLat + this.maxLat) / 2,
      (this.minLng + this.maxLng) / 2
    );
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
