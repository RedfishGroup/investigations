import * as THREE from 'three'

import { ecef_lla, lla_ecef } from './ECEF.js'

export function geometryFromMartiniMesh(
    mesh,
    elevation,
    bounds,
    index,
    matrix = new THREE.Matrix3()
) {
    if (mesh && bounds) {
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

        updateGeometry(geometry, mesh, elevation, bounds, matrix)

        return geometry
    }
}

export function updateGeometry(geometry, mesh, elevation, bounds, matrix) {
    setIndex(geometry, mesh.triangles)
    let attributes = verticesFromMartiniMesh(mesh, elevation, bounds, matrix)
    setPosition(geometry, attributes.vertices)
    setElevation(geometry, attributes.elevations)
    geometry.setDrawRange(0, mesh.triangles.length)
}

function verticesFromMartiniMesh(
    mesh,
    elevation,
    bounds,
    matrix = new THREE.Matrix3()
) {
    if (mesh && bounds) {
        let { north, south, east, west } = bounds

        let vertices = new Float32Array((mesh.vertices.length / 2) * 3)
        let elevations = new Float32Array(mesh.vertices.length / 2)

        // elevation tiles are always square
        let dim = elevation.width

        for (let i = 0; i < mesh.vertices.length; i += 2) {
            let mercX = mesh.vertices[i]
            let mercY = mesh.vertices[i + 1]

            let elev = elevation.sample(mercX, dim - mercY - 1, false)
            elevations[i / 2] = elev

            const dim256 = dim-1
            let lon = (mercX / (dim256)) * (east - west) + west
            let lat = (mercY / (dim256)) * (north - south) + south

            let [x, y, z] = lla_ecef(lat, lon, elev)
            let vec = new THREE.Vector3(x, y, z).applyMatrix4(matrix)

            let index = 3 * (i / 2)
            vertices[index] = vec.x
            vertices[index + 1] = vec.y
            vertices[index + 2] = vec.z
        }

        return { vertices, elevations }
    }
}

function setIndex(geometry, indices) {
    // update face indices
    for (let j = 0; j < indices.length; j++) {
        geometry.index.setX(j, indices[j])
    }
    geometry.index.needsUpdate = true
}

function setPosition(geometry, vertices) {
    // update positions
    for (let j = 0; j < vertices.length; j += 3) {
        geometry.attributes.position.setXYZ(
            j / 3,
            vertices[j + 0],
            vertices[j + 1],
            vertices[j + 2]
        )
    }
    geometry.attributes.position.needsUpdate = true
}

function setElevation(geometry, elevation) {
    // update elevation
    let min = Number.POSITIVE_INFINITY
    let max = Number.NEGATIVE_INFINITY
    for (let j = 0; j < elevation.length; j++) {
        if (elevation[j] < min) {
            min = elevation[j]
        }
        if (elevation[j] > max) {
            max = elevation[j]
        }
        geometry.attributes.elevation.setX(j, elevation[j])
    }
    geometry.attributes.elevation.min = min
    geometry.attributes.elevation.max = max
    geometry.attributes.elevation.needsUpdate = true
}
