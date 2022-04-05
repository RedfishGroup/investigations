import * as THREE from 'three'

export function calculateRadiusAndZoom(options = {}) {
    // calculate radius of globe
    let radius, zoom
    if (
        !options.bounds &&
        options.zoom !== undefined &&
        options.center &&
        options.center.Latitude !== undefined &&
        options.center.Longitude !== undefined
    ) {
        let dim = 180 / 2 ** (options.zoom + 1)
        options.bounds = {
            north: options.center.Latitude + dim / 2,
            south: options.center.Latitude - dim / 2,
            east: options.center.Longitude + dim,
            west: options.center.Longitude - dim,
        }
    }

    if (
        options.bounds &&
        options.bounds.north !== undefined &&
        options.bounds.south !== undefined &&
        options.bounds.east !== undefined &&
        options.bounds.west !== undefined
    ) {
        radius = calculateRadius(options.bounds)
        if (options.zoom) {
            zoom = options.zoom
        } else {
            zoom = calculateZoom(options.bounds)
        }
    } else {
        radius = 1
        zoom = 1
    }

    return { bounds: options.bounds, radius, zoom }
}

export function calculateZoom(bounds) {
    let north = bounds.north
    let south = bounds.south
    let east = bounds.east
    let west = bounds.west
    if (north - south > east - west) {
        return Math.round(Math.log2(180 / (north - south))) + 1
    } else {
        return Math.round(Math.log2(180 / (east - west))) + 1
    }
}

function calculateRadius(bounds) {
    let north = bounds.north
    let south = bounds.south
    let east = bounds.east
    let west = bounds.west
    return (
        5 *
        Math.sqrt(
            (4 * Math.PI) /
                ((Math.sin(north * (Math.PI / 180)) -
                    Math.sin(south * (Math.PI / 180))) *
                    (east - west) *
                    (Math.PI / 180))
        )
    )
}

export function calculateBounds(options = {}) {
    if (
        options.zoom !== undefined &&
        options.center &&
        options.center.Latitude !== undefined &&
        options.center.Longitude !== undefined
    ) {
        let dim = 180 / 2 ** (options.zoom + 1)
        let bounds = {
            north: options.center.Latitude + dim,
            south: options.center.Latitude - dim,
            east: options.center.Longitude + dim,
            west: options.center.Longitude - dim,
        }
        return bounds
    }
}

export function georeferenceObj(obj, terrain) {
    if (obj && terrain && terrain.isGeoreferenced) {
        let orientation = {
            ...obj.orientation,
            ...obj.overrideOrientation,
        }

        let lat = orientation.Latitude
        let lon = orientation.Longitude
        let elev =
            orientation.Elevation ||
            orientation.Altitude ||
            orientation.altitude
        let clampToGround = obj.clampToGround
        if (clampToGround === undefined) clampToGround = elev === undefined

        if (lat !== undefined && lon !== undefined) {
            let pos = terrain.getRealXYZPosition(lat, lon, elev, clampToGround)
            obj.position.set(pos.x, pos.y, pos.z)
        }

        let { x, y, z, w } = { ...orientation }
        if (
            x !== undefined &&
            y !== undefined &&
            z !== undefined &&
            w !== undefined
        ) {
            obj.setRotationFromQuaternion(
                rotateQuaternionToECEF(
                    new THREE.Quaternion(x, y, z, w),
                    terrain,
                    lat,
                    lon
                )
            )
        }
    }
}

export function rotateQuaternionToECEF(quaternion, terrain, lat, lon) {
    // create rotational matrix
    let lonRotate = new THREE.Matrix4().makeRotationZ(lon * (Math.PI / 180.0))
    let latRotate = new THREE.Matrix4().makeRotationY(
        (90.0 - lat) * (Math.PI / 180.0)
    )

    let r = lonRotate
    r.multiply(latRotate)

    // make quaternion from rotational matrix
    let q_ = new THREE.Quaternion().setFromRotationMatrix(r)

    q_.multiply(
        new THREE.Quaternion().setFromRotationMatrix(
            new THREE.Matrix4().makeRotationZ(Math.PI / 2)
        )
    )

    // multiply the two quaternions to return correct frame of reference
    q_.multiply(quaternion)

    // rotate to local frame of reference from ECEF
    if (terrain && terrain.isGeoreferenced) {
        let rotation = new THREE.Euler().copy(terrain.rotation)
        q_ = new THREE.Quaternion().setFromEuler(rotation).multiply(q_)
    }

    return q_
}

export function rotateQuaternionFromECEF(quaternion, terrain, lat, lon) {
    // rotate from local frame of reference to ECEF
    if (terrain && terrain.isGeoreferenced) {
        quaternion = new THREE.Quaternion()
            .setFromEuler(terrain.rotation)
            .inverse()
            .multiply(quaternion)
    }

    // create rotational matrix
    let lonRotate = new THREE.Matrix4().makeRotationZ(lon * (Math.PI / 180.0))
    let latRotate = new THREE.Matrix4().makeRotationY(
        (90.0 - lat) * (Math.PI / 180.0)
    )

    let r = lonRotate
    r.multiply(latRotate)

    let q_ = new THREE.Quaternion()
        .setFromRotationMatrix(new THREE.Matrix4().makeRotationZ(Math.PI / 2))
        .inverse()

    // make quaternion from inverse of rotational matrix
    q_.multiply(new THREE.Quaternion().setFromRotationMatrix(r).inverse())

    // multiply the two quaternions to return from ECEF frame of reference
    q_.multiply(quaternion)

    return q_
}

export function drawWorldAxes(scene) {
    if (scene) {
        // world axes
        let geometryX = new THREE.Geometry()
        let geometryY = new THREE.Geometry()
        let geometryZ = new THREE.Geometry()
        geometryX.vertices.push(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(2, 0, 0)
        )
        geometryY.vertices.push(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 2, 0)
        )
        geometryZ.vertices.push(
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, 2)
        )

        scene.add(
            new THREE.Line(
                geometryX,
                new THREE.LineBasicMaterial({ color: 0xff0000 })
            )
        )
        scene.add(
            new THREE.Line(
                geometryY,
                new THREE.LineBasicMaterial({ color: 0x00bb00 })
            )
        )
        scene.add(
            new THREE.Line(
                geometryZ,
                new THREE.LineBasicMaterial({ color: 0x0000ff })
            )
        )
    }
}

export function isInBounds(lat, lon, bounds) {
    if (
        bounds &&
        bounds.north !== undefined &&
        bounds.south !== undefined &&
        bounds.east !== undefined &&
        bounds.west !== undefined
    ) {
        let north = bounds.north,
            south = bounds.south,
            east = bounds.east,
            west = bounds.west
        if (
            north > -90 &&
            north < 90 &&
            south > -90 &&
            south < 90 &&
            east > -180 &&
            east < 180 &&
            west > -180 &&
            west < 180
        ) {
            if (east < west) east += 360
            if (lon < east && lon > west && lat < north && lat > south)
                return true
        }
    }
    return false
}

export function lat2Tile(lat, zoom) {
    if (lat < -90) lat = lat + 180
    if (lat > 90) lat = lat - 180

    // convert to radians
    lat = lat * (Math.PI / 180)

    return (
        ((1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2) *
        2 ** zoom
    )
}

export function lon2Tile(lon, zoom) {
    if (lon < -180) lon = lon + 360
    if (lon > 180) lon = lon - 360

    return ((lon + 180) / 360) * 2 ** zoom
}

export function getCenterLatLong(bounds) {
    if (
        bounds &&
        bounds.north !== undefined &&
        bounds.south !== undefined &&
        bounds.east !== undefined &&
        bounds.west !== undefined
    ) {
        let north = bounds.north,
            south = bounds.south,
            east = bounds.east,
            west = bounds.west
        if (
            north > -90 &&
            north <= 90 &&
            south >= -90 &&
            south < 90 &&
            east > -180 &&
            east <= 180 &&
            west >= -180 &&
            west < 180
        ) {
            if (east < west) east += 360

            let lat = (north - south) / 2 + south
            let lon = (east - west) / 2 + west

            if (lon > 180) lon += 360
            if (lon < -180) lon -= 360

            return { lat, lon }
        }
    }
}
