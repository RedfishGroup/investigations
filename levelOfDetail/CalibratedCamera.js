import * as THREE from 'three'

export class CalibratedCamera extends THREE.Camera {
    constructor(options = {}) {
        super(options)

        this.fx = options.fx || 600
        this.fy = options.fy || 600
        this.x0 = options.x0 || 0.0
        this.y0 = options.y0 || 0.0
        this.s = options.s || 0.0
        this.height = options.height || 400
        this.width = options.width || 400
        this.near = options.near || 0.01
        this.far = options.far || 20

        this.initVals = {
            fx: this.fx,
            fy: this.fy,
            x0: this.x0,
            y0: this.y0,
            s: this.s,
            height: this.height,
            width: this.width,
            near: this.near,
            far: this.far,
        }

        this.fov = 2 * Math.atan(this.width / 2 / this.fx) * (180 / Math.PI)

        this.isCalibratedCamera = true
        this.isPerspectiveCamera = true
        this.screenToCameraMatrix = new THREE.Matrix4()

        this.updateProjectionMatrix()
    }

    updateProjectionMatrix() {
        this.projectionMatrix.makeOrthographic(
            -this.width / 2.0,
            this.width / 2.0,
            this.height / 2.0,
            -this.height / 2.0,
            this.near,
            this.far
        )

        var X = this.near + this.far
        var Y = this.near * this.far
        var intrinsicCameraMatrix = new THREE.Matrix4()
        intrinsicCameraMatrix.set(
            this.fx,
            this.s,
            -this.x0,
            0,
            0,
            this.fy,
            -this.y0,
            0,
            0,
            0,
            X,
            Y,
            0,
            0,
            -1,
            0
        )

        this.projectionMatrix.multiply(intrinsicCameraMatrix)
        this.updateScreenToCameraMatrix()

        this.fov = 2 * Math.atan(this.width / 2 / this.fx) * (180 / Math.PI)
    }

    updateScreenToCameraMatrix() {
        this.screenToCameraMatrix.set(
            this.fx,
            this.s,
            -this.x0,
            0,
            0,
            this.fy,
            -this.y0,
            0,
            0,
            0,
            -1,
            0,
            0,
            0,
            0,
            1
        )
        this.screenToCameraMatrix.invert(this.screenToCameraMatrix)
        this.screenToCameraMatrixNeedsUpdate = false
    }

    resetIntrinsics() {
        this.fx = this.initVals.fx
        this.fy = this.initVals.fy
        this.x0 = this.initVals.x0
        this.y0 = this.initVals.y0
        this.s = this.initVals.s
        this.height = this.initVals.height
        this.width = this.initVals.width
        this.near = this.initVals.near
        this.far = this.initVals.far

        this.updateMatrix()
        this.updateProjectionMatrix()
        this.updateScreenToCameraMatrix()
    }

    clone() {
        var result = new CalibratedCamera({
            fx: this.fx,
            fy: this.fy,
            x0: this.x0,
            y0: this.y0,
            s: this.s,
            width: this.width,
            height: this.height,
            near: this.near,
            far: this.far,
        })
        result.position.copy(this.position)
        result.rotation.copy(this.rotation)
        result.rotationAutoUpdate = this.rotationAutoUpdate
        result.rotation.order = this.rotation.order

        result.fov = this.fov
        result.isCalibratedCamera = this.isCalibratedCamera
        result.isPerspectiveCamera = this.isPerspectiveCamera

        result.matrix.copy(this.matrix)
        result.matrixAutoUpdate = this.matrixAutoUpdate

        return result
    }
}
