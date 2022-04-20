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

        //let start = Date.now()
        updateGeometry(geometry, mesh, elevation, bounds, matrix)
        //console.log('elapsed time: ' + (Date.now() - start))

        return geometry
    }
}

export function updateGeometry(geometry, mesh, elevation, bounds, matrix) {
    setIndex(geometry, mesh.triangles)
    attributesFromMartiniMesh(geometry, mesh, elevation, bounds, matrix)
    geometry.setDrawRange(0, mesh.triangles.length)
}

function attributesFromMartiniMesh(
    geometry,
    mesh,
    elevation,
    bounds,
    matrix = new THREE.Matrix3()
) {
    if (mesh && bounds) {
        let { north, south, east, west } = bounds

        // elevation tiles are always square
        const dim = elevation.width
        const dim256 = dim - 1

        // for calculating minimum and maximum elevation
        let min = Number.POSITIVE_INFINITY
        let max = Number.NEGATIVE_INFINITY

        for (let i = 0; i < mesh.vertices.length; i += 2) {
            let mercX = mesh.vertices[i]
            let mercY = mesh.vertices[i + 1]

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
    }
}

function setIndex(geometry, indices) {
    // update face indices
    for (let j = 0; j < indices.length; j++) {
        geometry.index.setX(j, indices[j])
    }
    geometry.index.needsUpdate = true
}
