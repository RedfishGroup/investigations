import * as THREE from 'three'

import { GUI } from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js'
import { GlobeReference } from './GlobeReference.js'
import { drawXYPlane, drawWorldAxes } from './geoTools.js'

import { debounced } from './debounced.js'

import { updateGeometry } from './geometryUtils.js'

import { ElevationShaderMaterial } from './materialUtils.js'

import { getTileBounds, latLngToSlippyXYZ } from './utils.js'

import { XYZTileNode } from './XYZTileNode.js'

console.log(GUI)

async function main() {
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
        // Albuquerque
        //Latitude: 35.19251772180017,
        //Longitude: -106.42811011436379,

        // Everest
        Latitude: 27.9881,
        Longitude: 86.925,
    }
    const zoom = 6
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
        color: 0xffaa00,
        wireframe: false,
    }

    const material = new ElevationShaderMaterial(materialParams)

    const tileTree = new XYZTileNode(x, y, z, null)
    const threeMesh = await tileTree.getThreeMesh(
        martiniParams.error,
        globeReference.getMatrix(),
        material
    )
    material.setMin(threeMesh.geometry.attributes.elevation.min)
    material.setMax(threeMesh.geometry.attributes.elevation.max)
    scene.add(threeMesh)

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
        updateMeshes(error, tileTree, globeReference, material)
    })
    const lodGUI = gui.addFolder('Level of Detail')
    lodGUI.open()
    lodGUI
        .add(
            {
                add: async (foo) => {
                    await splitAllTiles(
                        tileTree,
                        scene,
                        martiniParams.error,
                        globeReference,
                        material
                    )
                    console.log('done',  tileTree,tileTree.toString())
                },
            },
            'add'
        )
        .name('split all tiles')

    // start animating
    animate()
}

async function splitAllTiles(tileTree, scene, error, globeReference, material) {
    return Promise.all(
        tileTree.getLeafNodes().map((node) => {
            return splitNode(node, scene, error, globeReference, material)
        })
    )
}

async function splitNode(node, scene, martiniError, globeReference, material) {
    if (node.threeMesh) {
        scene.remove(node.threeMesh)
    }
    const promises = node.getChildren().map(async (child) => {
        let mesh = await child.getThreeMesh(
            martiniError,
            globeReference.getMatrix(),
            material
        )
        console.log('mesh', mesh)
        scene.add(mesh)
    })
    return Promise.all(promises)
}

const updateMeshes = debounced(
    async (error, tileTree, globeReference, material) => {
        for (let tm of tileTree.getLeafNodes()) {
            updateGeometry(
                tm.threeMesh.geometry,
                await tm.getMartiniMesh(error),
                tm.elevation,
                tm.getBounds(),
                globeReference.getMatrix()
            )
        }
    },
    200,
    undefined,
    true
)

main()
