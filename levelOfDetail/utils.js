import { LatLngBounds } from "./LatLngBounds.js";

/**
 *
 * @param {Image} image
 * @returns ImageData
 */
export function imageToImageData(image) {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  return context.getImageData(0, 0, image.width, image.height);
}

/**
 * Lat long to tile coordinates
 * @param {*} lat
 * @param {*} lng
 * @param {*} z
 * @returns
 */
/* prettier-ignore */
export function latLngToSlippyXYZ(lat, lng, z){
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, z))
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z))
    return [x, y, z]
}


export function slippyXYZToLatLng(x,y,z){
    const lng = x / Math.pow(2, z) * 360 - 180
    const n = Math.PI - 2 * Math.PI * y / Math.pow(2, z)
    const lat = 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
    return [lat, lng]
}

export function getTileBounds(x, y, z){
    const [lat1, lng1] = slippyXYZToLatLng(x, y, z)
    const [lat2, lng2] = slippyXYZToLatLng(x+1, y+1, z)
    return new LatLngBounds(lat1, lng1, lat2, lng2)
}




