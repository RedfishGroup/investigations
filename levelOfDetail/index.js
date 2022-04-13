import * as THREE from 'three'

import { GUI } from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js'

import { Frustum } from './Frustum.js'
import { getXYPlane } from './geoTools.js'
import { GlobeReference } from './GlobeReference.js'
import { CalibratedCamera } from './CalibratedCamera.js'

import { debounced } from './debounced.js'

import { updateGeometry } from './geometryUtils.js'

import {
    unpackPixel,
    renderToUint8Array,
    DepthShaderMaterial,
    TilePickingMaterial,
    ZoomPickingMaterial,
    ElevationShaderMaterial,
    TileNeedsUpdateMaterial,
    TileIndexColorMaterial,
} from './materialUtils.js'

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

    // tiling renderer setup
    let width = 300
    let height = 200
    const tileRenderer = new THREE.WebGLRenderer()
    tileRenderer.setSize(width, height)
    tileRenderer.setClearColor('#000000')
    const tileParent = document.querySelector('#viewDiv')
    const tileCanvas = tileRenderer.domElement
    tileCanvas.onwheel = function (e) {
        e.preventDefault()
    }
    tileParent.appendChild(tileCanvas)

    // render target setup
    const depthTarget = new THREE.WebGLRenderTarget(width, height)

    // tiling camera setup
    const tileCam = new CalibratedCamera({ width, height })
    //tileCam.position.set(-0.5, -0.5, 0.285)
    tileCam.position.set(1.8, 1.8, 1)
    tileCam.up.set(0, 0, 1)
    tileCam.updateMatrix()
    tileCam.updateProjectionMatrix()
    //tileCam.lookAt(-0.5, 0.5, 0.3)
    tileCam.lookAt(0.1, 0.1, 0)

    // create scene
    const scene = new THREE.Scene()

    // put in axes
    const axes = new THREE.AxesHelper(2)
    scene.add(axes)

    // put in x-y plane
    const xyPlane = getXYPlane()
    scene.add(xyPlane)

    // camera viewing frustum
    const frustum = new Frustum({ far: 0.2, camera: tileCam })
    frustum.position.set(
        tileCam.position.x,
        tileCam.position.y,
        tileCam.position.z
    )
    frustum.rotation.set(
        tileCam.rotation.x,
        tileCam.rotation.y,
        tileCam.rotation.z
    )

    scene.add(frustum)

    frustum.updateGeometry()

    const center = {
        // Albuquerque
        //Latitude: 35.19251772180017,
        //Longitude: -106.42811011436379,

        // Shiprock
        Latitude: 36.69165,
        Longitude: -108.83866,

        // Everest
        // Latitude: 27.9881,
        // Longitude: 86.925,
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

    let martiniParams = { error: 1 }

    let materialParams = {
        side: THREE.BackSide,
        color: 0xffaa00,
        wireframe: false,
    }

    const elevationMaterial = new ElevationShaderMaterial(materialParams)
    const zoomMaterial = new ZoomPickingMaterial(materialParams)
    const depthMaterial = new DepthShaderMaterial(materialParams)
    const tileIndexMaterial = new TilePickingMaterial(materialParams)
    const tileIndexColorMaterial = new TileIndexColorMaterial(materialParams)
    const tileNeedsUpdateMaterial = new TileNeedsUpdateMaterial({
        fov: tileCam.vfov * (Math.PI / 180),
        side: THREE.BackSide,
        scale: 1 / globeReference.getScale(),
        height,
        depthTexture: depthTarget.texture,
    })

    const tileTree = new XYZTileNode(x, y, z, null)
    const threeMesh = await tileTree.getThreeMesh(
        martiniParams.error,
        globeReference.getMatrix(),
        elevationMaterial
    )
    elevationMaterial.setMin(threeMesh.geometry.attributes.elevation.min)
    elevationMaterial.setMax(threeMesh.geometry.attributes.elevation.max)
    scene.add(threeMesh)

    // dat.gui menu setup
    const gui = new GUI()
    const materialGUI = gui.addFolder('Material')
    materialGUI.open()
    materialGUI.add(materialParams, 'wireframe').onChange((bool) => {
        elevationMaterial.wireframe = bool
    })
    materialGUI.addColor(materialParams, 'color').onChange((color) => {
        elevationMaterial.setColor(color)
    })
    const martiniGUI = gui.addFolder('Martini')
    martiniGUI.open()
    martiniGUI.add(martiniParams, 'error', 0, 20, 0.5).onChange((error) => {
        updateMeshes(error, tileTree, globeReference)
    })
    const lodGUI = gui.addFolder('Level of Detail')
    lodGUI.open()
    lodGUI
        .add(
            {
                add: async () => {
                    await splitAllTiles(
                        tileTree,
                        scene,
                        martiniParams.error,
                        globeReference,
                        elevationMaterial
                    )
                    console.log('done', tileTree, tileTree.toString())
                },
            },
            'add'
        )
        .name('split all tiles')
    lodGUI
        .add(
            {
                combine: async () => {
                    await combineAllTiles(
                        tileTree,
                        scene,
                        martiniParams.error,
                        globeReference,
                        elevationMaterial
                    )
                    console.log('done', tileTree, tileTree.toString())
                },
            },
            'combine'
        )
        .name('combine all tiles')

    window.tilesNeedUpdate = true
    // animation function
    const animate = function () {
        requestAnimationFrame(animate)

        // update orbit controls
        controls.update()

        axes.visible = false
        frustum.visible = false
        xyPlane.visible = false

        if (window.tilesNeedUpdate) {
            // render to depth
            scene.overrideMaterial = depthMaterial
            tileRenderer.setRenderTarget(depthTarget)
            tileRenderer.render(scene, tileCam)

            // reset render target
            tileRenderer.setRenderTarget(null)

            // render tile indices
            scene.overrideMaterial = tileIndexMaterial
            let indexData = renderToUint8Array(tileRenderer, scene, tileCam)

            // render zoom correction data
            scene.overrideMaterial = tileNeedsUpdateMaterial
            let zoomData = renderToUint8Array(tileRenderer, scene, tileCam)

            // test
            readTileData(indexData, zoomData, tileCam.width, tileCam.height)

            // reset override material
            scene.overrideMaterial = null

            // set flag to false
            window.tilesNeedUpdate = false
        }

        scene.overrideMaterial = tileIndexColorMaterial
        tileRenderer.render(scene, tileCam)
        scene.overrideMaterial = null

        axes.visible = true
        frustum.visible = true
        xyPlane.visible = true

        // regular render
        renderer.render(scene, camera)
    }

    // start animating
    animate()
}

async function readTileData(indexData, zoomData, width, height) {
    let m = 0.9999
    console.log(
        'top left corner',
        'tile index: ' + unpackPixel(0, m, indexData, width, height),
        'zoom correction: ' + unpackPixel(0, m, zoomData, width, height)
    )
    console.log(
        'top right corner',
        'tile index: ' + unpackPixel(m, m, indexData, width, height),
        'zoom correction: ' + unpackPixel(m, m, zoomData, width, height)
    )
    console.log(
        'bottom left corner',
        'tile index: ' + unpackPixel(0, 0, indexData, width, height),
        'zoom correction: ' + unpackPixel(0, 0, zoomData, width, height)
    )
    console.log(
        'bottom right corner',
        'tile index: ' + unpackPixel(m, 0, indexData, width, height),
        'zoom correction: ' + unpackPixel(m, 0, zoomData, width, height)
    )
    console.log(
        'center',
        'tile index: ' + unpackPixel(0.5, 0.5, indexData, width, height),
        'zoom correction: ' + unpackPixel(0.5, 0.5, zoomData, width, height)
    )
}

async function splitAllTiles(tileTree, scene, error, globeReference, material) {
    return Promise.all(
        tileTree.getLeafNodes().map((node) => {
            return splitNode(node, scene, error, globeReference, material)
        })
    ).then(() => {
        window.tilesNeedUpdate = true
    })
}

async function splitNode(node, scene, martiniError, globeReference, material) {
    const promises = node.getChildren().map(async (child) => {
        let mesh = await child.getThreeMesh(
            martiniError,
            globeReference.getMatrix(),
            material
        )
        return mesh
    })
    return Promise.all(promises).then((results) => {
        scene.remove(node.threeMesh)
        for (let i in results) {
            scene.add(results[i])
        }
    })
}

async function combineAllTiles(
    tileTree,
    scene,
    martiniError,
    globeReference,
    material
) {
    let parents = []
    tileTree.getLeafNodes().map((node) => {
        if (!parents.includes(node.parent)) {
            parents.push(node.parent)
        }
    })
    const promises = parents.map(async (parent) => {
        await parent.getThreeMesh(
            martiniError,
            globeReference.getMatrix(),
            material
        )
        return parent
    })
    Promise.all(promises)
        .then((parents) => {
            for (let i in parents) {
                let children = parents[i].getChildren()
                for (let j in children) {
                    scene.remove(children[j].threeMesh)
                    //tileTree.removeNode(children[j])
                }
                scene.add(parents[i].threeMesh)
            }
        })
        .then(() => {
            window.tilesNeedUpdate = true
        })
}

const updateMeshes = debounced(
    async (error, tileTree, globeReference) => {
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
