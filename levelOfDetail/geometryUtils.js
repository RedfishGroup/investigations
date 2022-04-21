import * as THREE from 'three'

import { lla_ecef } from './ECEF.js'

export function geometryFromMartiniMesh(
    martiniMesh,
    elevation,
    bounds,
    index,
    matrix = new THREE.Matrix3()
) {
    if (martiniMesh && bounds) {
        let maxPoints = elevation.width * elevation.height * 3 * 3

        let geometry = new THREE.BufferGeometry()
        geometry.setIndex(
            new THREE.BufferAttribute(new Uint32Array(maxPoints), 1)
        )
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(maxPoints * 3), 3)
        )
        geometry.setAttribute(
            'elevation',
            new THREE.BufferAttribute(new Float32Array(maxPoints), 1)
        )
        geometry.setAttribute(
            'tileIndex',
            new THREE.BufferAttribute(
                new Float32Array(maxPoints).fill(index),
                1
            )
        )

        updateGeometry(geometry, martiniMesh, elevation, bounds, matrix)

        return geometry
    }
}

export function updateGeometry(
    geometry,
    martiniMesh,
    elevation,
    bounds,
    matrix
) {
    setIndex(geometry, martiniMesh.triangles)
    attributesFromMartiniMesh(geometry, martiniMesh, elevation, bounds, matrix)
    geometry.setDrawRange(0, martiniMesh.triangles.length)
}

function attributesFromMartiniMesh(
    geometry,
    martiniMesh,
    elevation,
    bounds,
    matrix = new THREE.Matrix3()
) {
    if (martiniMesh && bounds) {
        let { north, south, east, west } = bounds

        // elevation tiles are always square
        const dim = elevation.width
        const dim256 = dim - 1

        // for calculating minimum and maximum elevation
        let min = Number.POSITIVE_INFINITY
        let max = Number.NEGATIVE_INFINITY

        // for later calculating the skirt
        let edgeIndices = { north: [], south: [], east: [], west: [] }
        for (let i = 0; i < martiniMesh.vertices.length; i += 2) {
            let mercX = martiniMesh.vertices[i]
            let mercY = martiniMesh.vertices[i + 1]

            if (mercX === 0) edgeIndices.west.push(i)
            if (mercY === 0) edgeIndices.north.push(i)
            if (mercX === 256) edgeIndices.east.push(i)
            if (mercY === 256) edgeIndices.south.push(i)

            let elev = elevation.sample(mercX, mercY, false)
            if (elev < min) min = elev
            if (elev > max) max = elev

            let lon = (mercX / dim256) * (east - west) + west
            let lat = (mercY / dim256) * (south - north) + north

            let [x, y, z] = lla_ecef(lat, lon, elev)
            let vec = new THREE.Vector3(x, y, z).applyMatrix4(matrix)

            let index = i / 2
            geometry.attributes.position.setXYZ(index, vec.x, vec.y, vec.z)
            geometry.attributes.elevation.setX(index, elev)
        }

        geometry.attributes.elevation.min = min
        geometry.attributes.elevation.max = max
        geometry.attributes.elevation.needsUpdate = true
        geometry.attributes.position.needsUpdate = true

        geometry.edgeIndices = edgeIndices
    }
}

function setIndex(geometry, indices) {
    // update face indices
    for (let j = 0; j < indices.length; j++) {
        geometry.index.setX(j, indices[j])
    }
    geometry.index.needsUpdate = true
}

export function makeSkirtGeometry(elevation, bounds, matrix) {
    let { north, south, east, west } = bounds

    const dim = elevation.width
    const dim256 = dim - 1

    let indices = []
    let vertices = []

    let index = 0

    // north and south edges
    for (let j = 0; j < dim; j += dim256) {
        for (let i = 0; i < dim; i++) {
            let mercX = i
            let mercY = j
            let elev = elevation.sample(mercX, mercY, false)

            let lon = (mercX / dim256) * (east - west) + west
            let lat = (mercY / dim256) * (south - north) + north

            let [x1, y1, z1] = lla_ecef(lat, lon, elev)
            let vec1 = new THREE.Vector3(x1, y1, z1).applyMatrix4(matrix)

            let [x2, y2, z2] = lla_ecef(lat, lon, 0)
            let vec2 = new THREE.Vector3(x2, y2, z2).applyMatrix4(matrix)

            vertices.push(vec1.x, vec1.y, vec1.z, vec2.x, vec2.y, vec2.z)

            if (i < dim - 1) {
                if (j === 0) {
                    indices.push(
                        index + 0,
                        index + 2,
                        index + 3,
                        index + 3,
                        index + 1,
                        index + 0
                    )
                } else {
                    indices.push(
                        index + 0,
                        index + 1,
                        index + 3,
                        index + 3,
                        index + 2,
                        index + 0
                    )
                }
            }

            index += 2
        }
    }

    // east and west edges
    for (let j = 0; j < dim; j += dim256) {
        for (let i = 0; i < dim; i++) {
            let mercX = j
            let mercY = i
            let elev = elevation.sample(mercX, mercY, false)

            let lon = (mercX / dim256) * (east - west) + west
            let lat = (mercY / dim256) * (south - north) + north

            let [x1, y1, z1] = lla_ecef(lat, lon, elev)
            let vec1 = new THREE.Vector3(x1, y1, z1).applyMatrix4(matrix)

            let [x2, y2, z2] = lla_ecef(lat, lon, 0)
            let vec2 = new THREE.Vector3(x2, y2, z2).applyMatrix4(matrix)

            vertices.push(vec1.x, vec1.y, vec1.z, vec2.x, vec2.y, vec2.z)

            if (i < dim - 1) {
                if (j === 256) {
                    indices.push(
                        index + 0,
                        index + 2,
                        index + 3,
                        index + 3,
                        index + 1,
                        index + 0
                    )
                } else {
                    indices.push(
                        index + 0,
                        index + 1,
                        index + 3,
                        index + 3,
                        index + 2,
                        index + 0
                    )
                }
            }

            index += 2
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setIndex(new THREE.BufferAttribute(Uint32Array.from(indices), 1))
    geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(Float32Array.from(vertices), 3)
    )

    return geometry
}
