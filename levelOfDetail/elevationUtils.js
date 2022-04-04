

import { imageToImageData, latLngToSlippyXYZ } from "./utils"

/**
 * Get Mapzen tiles for a slippy map tile as a float64array.
 * A description of the tile format can be found here: https://www.mapzen.com/blog/terrain-tile-service/
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} z 
 * @returns Float64Array
 */
export async function getAndDecodeTerrariumElevationTile(x, y, z){
    const image = await fetchTerrariumElevationTileImage(x, y, z)
    const imageData = imageToImageData(image)
    return decodeTerrarium(imageData)
}

/**
 * 
 * @param {*} lat 
 * @param {*} lng 
 * @param {*} z 
 * @returns Float64Array
 */
export async function getAndDecodeMapzenElevationTileFromLatLng(lat, lng, z){
    const [x, y, z] = latLngToSlippyXYZ(lat, lng, z)
    const result = await getAndDecodeTerrariumElevationTile(x, y, z)
    return result
}


/**
 * 
 * @param {ImageData} imageData 
 * @returns Float64Array
 */
export function decodeTerrarium(imageData){
    const data = imageData.data
    const width = imageData.width
    const height = imageData.height
    const result = new Float64Array(width * height)
    for(let i = 0; i < result.length; i ++){
        const i4 = 4*i
        const r = data[i4]
        const g = data[i4+1]
        const b = data[i4+2]
        const a = data[i4+3]
        const elevation = (r * 256 + g + b / 256) - 32768
        result[i] = elevation
    }
    return result
}

async function fetchTerrariumElevationTileImage(x, y, z){
    const url = `https://elevation-tiles-prod.s3.amazonaws.com/terrarium/${z}/${x}/${y}.png`
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = url
    return new Promise((resolve, reject) => {
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Failed to load image'))
    })
}



