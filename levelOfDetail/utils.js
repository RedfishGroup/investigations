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
