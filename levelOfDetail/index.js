import * as THREE from 'three'

import { GUI } from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js'
import { GlobeReference } from './GlobeReference.js'
import { drawXYPlane, drawWorldAxes } from './geoTools.js'

import { debounced } from './debounced.js'

import { testMartiniTerrain } from './tests.js'

import { updateGeometry } from './geometryUtils.js'

import {
    getTileBounds,
    latLngToSlippyXYZ,
    splitTileCoordinates,
} from './utils.js'

console.log(GUI)

function main() {
    // renderer setup
    const parent = document.querySelector('#threeDiv')
    const renderer = new THREE.WebGLRenderer()
    const bbox = parent.getBoundingClientRect()
    renderer.setSize(bbox.width, bbox.height)
    renderer.setClearColor('#000000')

    // append renderer canvas to html div
    const canvas = renderer.domElement
    canvas.onwheel = function (e) {
        e.preventDefault()
    }
    parent.appendChild(canvas)

    // camera setup
    const fov = 50
    const aspect = canvas.width / canvas.height
    const near = 0.01
    const far = 5000
    const camera = new THREE.PerspectiveCamera(fov, aspect, near, far)
    camera.position.set(2, 2, 1.5)
    camera.up.set(0, 0, 1)
    camera.updateMatrix()
    camera.updateProjectionMatrix()
    camera.lookAt(0, 0, 0)

    // orbit controls setup
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enablePan = false
    controls.maxDistance = 10
    controls.maxPolarAngle = Math.PI / 2

    // resize function for window
    document.body.onresize = function () {
        const bbox = parent.getBoundingClientRect()
        renderer.setSize(bbox.width, bbox.height)
        const aspect = canvas.width / canvas.height
        camera.aspect = aspect
        camera.updateMatrix()
        camera.updateProjectionMatrix()
    }

    // create scene
    const scene = new THREE.Scene()

    // put in axes
    drawWorldAxes(scene, 2)

    // put in x-y plane
    drawXYPlane(scene)

    // animation function
    const animate = function () {
        requestAnimationFrame(animate)

        controls.update()
        renderer.render(scene, camera)
    }

    const center = {
        //Latitude: 35.19251772180017,
        //Longitude: -106.42811011436379,
        Latitude: 27.9881,
        Longitude: 86.925,
    }
    const zoom = 10
    const [x, y, z] = latLngToSlippyXYZ(center.Latitude, center.Longitude, zoom)

    const bounds = getTileBounds(x, y, z)

    const globeReference = new GlobeReference({
        Latitude: bounds.center.lat,
        Longitude: bounds.center.lng,
        Elevation: 0,
        zoom,
    })

    let martiniParams = { error: 10 }

    let materialParams = {
        side: THREE.BackSide,
        color: 0xffff00,
        wireframe: false,
        vertexShader: `
        precision highp float;

        uniform vec3 uColor;

        varying vec3 vColor;
        varying vec3 vPosition;

        void main() {
            vColor = uColor;
            vPosition = position;

            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
        `,
        fragmentShader: `
            precision highp float;

            varying vec3 vColor;
            varying vec3 vPosition;

            void main() {
              gl_FragColor = vec4(
                vColor.r * vPosition.z,
                vColor.g * vPosition.z,
                vColor.b * vPosition.z,
                1.0);
            }
        `,
    }

    const material = new THREE.ShaderMaterial({
        ...materialParams,
        uniforms: {
            uColor: new THREE.Uniform(new THREE.Color(materialParams.color)),
        },
    })

    const tileMeshes = []
    console.log(tileMeshes)
    for (let i = -2; i <= 2; i++) {
        for (let j = -2; j <= 2; j++) {
            // martini test function for meshing tile
            testMartiniTerrain(x + i, y + j, z, {
                error: martiniParams.error,
                matrix: globeReference.getMatrix(),
            }).then((result) => {
                // add martini terrain mesh
                tileMeshes.push(result)
                result.threeMeshObject = new THREE.Mesh(
                    result.geometry,
                    material
                )
                scene.add(result.threeMeshObject)
            })
        }
    }

    // dat.gui menu setup
    const gui = new GUI()
    const materialGUI = gui.addFolder('Material')
    materialGUI.open()
    materialGUI.add(materialParams, 'wireframe').onChange((bool) => {
        material.wireframe = bool
    })
    materialGUI.addColor(materialParams, 'color').onChange((color) => {
        material.uniforms.uColor = new THREE.Uniform(new THREE.Color(color))
        material.uniformsNeedUpdate = true
    })
    const martiniGUI = gui.addFolder('Martini')
    martiniGUI.open()
    martiniGUI.add(martiniParams, 'error', 0, 20, 0.5).onChange((error) => {
        updateMeshes(error, tileMeshes, globeReference)
    })

    // start animating
    animate()
}

async function splitTile(x, y, z, martiniError, homeMatrix) {
    const coords = splitTileCoordinates(x, y, z)
    const promises = coords.map((coord) => {
        return testMartiniTerrain(coord.x, coord.y, coord.z, {
            error: martiniError,
            matrix: homeMatrix,
        })
    })
    const results = await Promise.all(promises)
    return results
}

const updateMeshes = debounced(async (error, tileMeshes, globeReference) => {
    for (let i in tileMeshes) {
        // calculate new mesh
        let mesh = tileMeshes[i].tile.getMesh(error)

        updateGeometry(
            tileMeshes[i].geometry,
            mesh,
            tileMeshes[i].elevation,
            tileMeshes[i].bounds,
            globeReference.getMatrix()
        )
    }
}, 200)

main()
