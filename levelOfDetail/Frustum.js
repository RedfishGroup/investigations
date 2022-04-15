/**
 * @author Emma Gould
 * based on code by ksimek  http://ksimek.github.com
 * Constructs a camera frustum from a calibrated camera.
 */

import * as THREE from 'three'
import { CalibratedCamera } from './CalibratedCamera.js'

export class Frustum extends THREE.LineSegments {
    constructor(options = {}) {
        super(options)
        this.camera = options.camera || new CalibratedCamera()
        this.near = options.near || 0.0
        this.far = options.far || 1.0
        this.color = options.color || 0xffffff

        this.isFrustum = true

        this.material = new THREE.LineBasicMaterial({ color: this.color })

        this.makeGeometry()
        this.updateGeometry()
    }

    makeGeometry() {
        // 12 edges of cube
        this.indices = [
            0, 1, 1, 3, 3, 2, 2, 0, 5, 4, 4, 6, 6, 7, 7, 5, 0, 5, 1, 4, 3, 6, 2,
            7,
        ]

        this.geometry = new THREE.BufferGeometry()
        this.geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(
                new Float32Array(this.indices.length * 3),
                3
            )
        )
    }

    updateGeometry() {
        this.geometry.applyMatrix4(new THREE.Matrix4())

        let w = this.camera.width
        let h = this.camera.height
        let d = this.far - this.near
        this.vertices = [
            new THREE.Vector3(w / 2, h / 2, d / 2),
            new THREE.Vector3(w / 2, h / 2, -d / 2),
            new THREE.Vector3(w / 2, -h / 2, d / 2),
            new THREE.Vector3(w / 2, -h / 2, -d / 2),
            new THREE.Vector3(-w / 2, h / 2, -d / 2),
            new THREE.Vector3(-w / 2, h / 2, d / 2),
            new THREE.Vector3(-w / 2, -h / 2, -d / 2),
            new THREE.Vector3(-w / 2, -h / 2, d / 2),
        ]

        for (let i = 0; i < this.vertices.length; i++) {
            this.vertices[i].z += d / 2 + this.near
            let z = this.vertices[i].z
            this.vertices[i].x *= z
            this.vertices[i].y *= z
        }

        for (let i = 0; i < this.indices.length; i++) {
            let pos = this.vertices[this.indices[i]]
            this.geometry.attributes.position.setXYZ(i, pos.x, pos.y, pos.z)
        }
        this.camera.updateScreenToCameraMatrix()
        this.geometry.applyMatrix4(this.camera.screenToCameraMatrix)
        this.geometry.attributes.position.needsUpdate = true
    }

    updatePosition() {
        this.position.set(
            this.camera.position.x,
            this.camera.position.y,
            this.camera.position.z
        )
        this.rotation.set(
            this.camera.rotation.x,
            this.camera.rotation.y,
            this.camera.rotation.z
        )
    }
}
