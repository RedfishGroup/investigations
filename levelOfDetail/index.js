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
    DepthShaderMaterial,
    TilePickingMaterial,
    ElevationShaderMaterial,
    TileNeedsUpdateMaterial,
    ZoomPickingMaterial,
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

    // create scene
    const scene = new THREE.Scene()

    // put in axes
    const axes = new THREE.AxesHelper(2)
    scene.add(axes)

    // put in x-y plane
    const xyPlane = getXYPlane()
    scene.add(xyPlane)

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

    // render targets setup
    const zoomTarget = new THREE.WebGLRenderTarget(width, height)
    const depthTarget = new THREE.WebGLRenderTarget(width, height)
    const indexTarget = new THREE.WebGLRenderTarget(width, height)

    // tiling camera setup
    const tileCam = new CalibratedCamera({ width, height })
    //tileCam.position.set(-0.5, -0.5, 0.285)
    tileCam.position.set(2, 2, 1.5)
    tileCam.up.set(0, 0, 1)
    tileCam.updateMatrix()
    tileCam.updateProjectionMatrix()
    //tileCam.lookAt(-0.5, 0.5, 0.3)
    tileCam.lookAt(0, 0, 0)

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

            // render zoom level
            scene.overrideMaterial = zoomMaterial
            tileRenderer.setRenderTarget(zoomTarget)
            tileRenderer.render(scene, tileCam)

            // render tile indices
            scene.overrideMaterial = tileIndexMaterial
            tileRenderer.setRenderTarget(indexTarget)
            tileRenderer.render(scene, tileCam)

            // reset override material
            scene.overrideMaterial = null
            tileRenderer.setRenderTarget(null)

            // set flag to false
            window.tilesNeedUpdate = false
        }

        scene.overrideMaterial = tileNeedsUpdateMaterial
        tileRenderer.render(scene, tileCam)
        scene.overrideMaterial = null

        axes.visible = true
        frustum.visible = true
        xyPlane.visible = true

        // regular render
        renderer.render(scene, camera)
    }

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
    const zoom = 11
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
    const zoomMaterial = new ZoomPickingMaterial({ side: THREE.BackSide })
    const depthMaterial = new DepthShaderMaterial({ side: THREE.BackSide })
    const tileIndexMaterial = new TilePickingMaterial({ side: THREE.BackSide })
    const tileNeedsUpdateMaterial = new TileNeedsUpdateMaterial({
        side: THREE.BackSide,
        zoomTexture: zoomTarget.texture,
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
                    console.log('do it backwards')
                },
            },
            'combine'
        )
        .name('combine all tiles')

    // start animating
    animate()
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
