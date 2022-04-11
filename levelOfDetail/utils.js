import { LatLngBounds } from './LatLngBounds.js'
import DataSet from 'https://code.agentscript.org/src/DataSet.js'
window.DataSet = DataSet


/**
 *
 * @param {Image} image
 * @returns ImageData
 */
export function imageToImageData(image) {
    const canvas = document.createElement('canvas')
    canvas.width = image.width
    canvas.height = image.height
    const context = canvas.getContext('2d')
    context.drawImage(image, 0, 0)
    return context.getImageData(0, 0, image.width, image.height)
}

/**
 * Lat long to tile coordinates
 * @param {*} lat
 * @param {*} lng
 * @param {*} z
 * @returns
 */
/* prettier-ignore */
export function latLngToSlippyXYZ(lat, lng, z) {
    const x = Math.floor((lng + 180) / 360 * Math.pow(2, z))
    const y = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z))
    return [x, y, z]
}

export function slippyXYZToLatLng(x, y, z) {
    const lng = (x / Math.pow(2, z)) * 360 - 180
    const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z)
    const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)))
    return [lat, lng]
}

export function getTileBounds(x, y, z) {
    const [lat1, lng1] = slippyXYZToLatLng(x, y, z)
    const [lat2, lng2] = slippyXYZToLatLng(x + 1, y + 1, z)
    return new LatLngBounds(lat1, lng1, lat2, lng2)
}

export function splitTileCoordinates(x, y, z) {
    const tileCoords = [
        { x: 2 * x, y: 2 * y, z: z + 1 },
        { x: 2 * x + 1, y: 2 * y, z: z + 1 },
        { x: 2 * x, y: 2 * y + 1, z: z + 1 },
        { x: 2 * x + 1, y: 2 * y + 1, z: z + 1 },
    ]
    return tileCoords
}


/**
 * 
 * Pad a dataset on all sides, by a certain number of pixels, with the value of the closest point.
 * 
 * @param {DataSet} ds
 * @param {Number} pixels 
 * @returns {DataSet}
 */
export function padDataSet(ds, pixels = 1) {
    const newWidth = ds.width + (2 * pixels)
    const newHeight = ds.height + (2 * pixels)
    const newData = new DataSet(newWidth, newHeight, new ds.data.constructor(newWidth * newHeight))
    for (let j = 0; j < newHeight; j++) {
        for (let i = 0; i < newWidth; i++) {
            const x = Math.min(ds.width - 1, Math.max(0, i - pixels))
            const y = Math.min(ds.height - 1, Math.max(0, j - pixels))
            const v = ds.sample(x, y)
            newData.setXY(i, j, v)
        }
    }
    return newData
}

/**
 * Pad the dataset with 1 pixel while maintaining the slope at the borders.
 * 
 * @param {DataSet} ds0 
 * @returns 
 */
export function padDataSetMaintainSlope(ds0) {
    const ds = padDataSet(ds0, 1)
    //top
    for (let x = 0; x < ds.width; x++) {
        const v1 = ds.getXY(x, 1)
        const gradient = ds.getXY(x, 2) - ds.getXY(x, 1)
        const val = v1 - gradient 
        ds.setXY(x, 0, val)
    }
    // bottom
    for (let x = 0; x < ds.width; x++) {
        const v1 = ds.getXY(x, ds.height - 2)
        const gradient = ds.getXY(x, ds.height - 2) - ds.getXY(x, ds.height - 3)
        const val = v1 + gradient 
        ds.setXY(x, ds.height - 1, val)
    }
    // left
    for (let y = 0; y < ds.height; y++) {
        const v1 = ds.getXY(1, y)
        const gradient = ds.getXY(2, y) - ds.getXY(1, y)
        const val = v1 - gradient 
        ds.setXY(0, y, val)
    }
    // right
    for (let y = 0; y < ds.height; y++) {
        const v1 = ds.getXY(ds.width - 2, y)
        const gradient = ds.getXY(ds.width - 2, y) - ds.getXY(ds.width - 3, y)
        const val = v1 + gradient 
        ds.setXY(ds.width - 1, y, val)
    }
    return ds
}