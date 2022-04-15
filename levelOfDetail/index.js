import * as THREE from 'three'

import { GUI } from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js'

import { Frustum } from './Frustum.js'
import { getXYPlane } from './geoTools.js'
import { GlobeReference } from './GlobeReference.js'
import { CalibratedCamera } from './CalibratedCamera.js'

import { debounced } from './debounced.js'

import {
    unpackPixel,
    renderToUint8Array,
    DepthShaderMaterial,
    TilePickingMaterial,
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
    controls.maxDistance = 15
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
    tileCam.position.set(5, -5, 0.5)
    tileCam.up.set(0, 0, 1)
    tileCam.updateMatrix()
    tileCam.updateProjectionMatrix()
    //tileCam.lookAt(-0.5, 0.5, 0.3)
    tileCam.lookAt(0, 0, 0.3)

    // create scene
    const scene = new THREE.Scene()

    // group for putting everything but terrain tiles in
    const group = new THREE.Group()
    scene.add(group)

    // group for putting all bounding boxes in
    const bboxGroup = new THREE.Group()
    scene.add(bboxGroup)

    window.bboxGroup = bboxGroup

    // put in axes
    const axes = new THREE.AxesHelper(2)
    group.add(axes)

    // put in x-y plane
    const xyPlane = getXYPlane()
    group.add(xyPlane)

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

    group.add(frustum)

    frustum.updateGeometry()

    const center = {
        // Albuquerque
        //Latitude: 35.19251772180017,
        //Longitude: -106.42811011436379,

        // Shiprock
        //Latitude: 36.69165,
        //Longitude: -108.83866,

        // Everest
        Latitude: 27.9881,
        Longitude: 86.925,
    }
    const zoom = 7
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
    materialGUI.addColor(materialParams, 'color').onChange((color) => {
        elevationMaterial.setColor(color)
    })
    materialGUI.add(bboxGroup, 'visible').name('bounding boxes')
    materialGUI.add(materialParams, 'wireframe').onChange((bool) => {
        elevationMaterial.wireframe = bool
    })
    const martiniGUI = gui.addFolder('Martini')
    martiniGUI.open()
    martiniGUI.add(martiniParams, 'error', 0, 20, 0.5).onChange((error) => {
        updateMeshes(error, tileTree, globeReference, elevationMaterial)
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
                        bboxGroup,
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
                        bboxGroup,
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
    const animate = async function () {
        // update orbit controls
        controls.update()

        group.visible = false
        let reset = false
        if (bboxGroup.visible) {
            bboxGroup.visible = false
            reset = true
        }

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

            // reset override material
            scene.overrideMaterial = null

            // set flag to false
            window.tilesNeedUpdate = false
            // test
            const tileZooms = await readTileData(
                tileTree,
                indexData,
                zoomData,
                tileCam.width,
                tileCam.height
            )
            // split
            const tooLow = tileZooms.filter((t) => t.tooLow)
            for (let t of tooLow) {
                if (!t.tile.isBusy()) {
                    //console.log('splitting', t.tile.toString())
                    splitNode(
                        t.tile,
                        scene,
                        bboxGroup,
                        martiniParams.error,
                        globeReference,
                        elevationMaterial
                    ).then(() => {
                        //console.log('done splitting')
                        window.tilesNeedUpdate = true
                    })
                }
            }
            // prune
            const tilesWithTooMuchDetail = tileZooms
                .filter((t) => t.tooHigh)
                .map((x) => x.tile)
            for (let t of tilesWithTooMuchDetail) {
                // if all siblings have too much detail then they are prunable
                const siblings = t.getSiblings()
                const canBePruned = siblings.every((s) => {
                    return tilesWithTooMuchDetail.includes(s)
                })
                // make sure no siblings are busy
                const siblingsNotBusy = siblings.every((s) => !s.isBusy())
                if (canBePruned && siblingsNotBusy) {
                    // remove siblings and add parent's mesh
                    console.log('TODO Need to prune', t.toString())
                }
            }
        }

        tileRenderer.render(scene, tileCam)

        group.visible = true
        if (reset) {
            bboxGroup.visible = true
        }

        // regular render
        renderer.render(scene, camera)
        requestAnimationFrame(animate)
    }

    // start animating
    animate()
}

async function readTileData(tileTree, indexData, zoomData, width, height) {
    let tiles = {}
    for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
            let index = unpackPixel(
                i / width,
                j / height,
                indexData,
                width,
                height
            )
            let zoom = unpackPixel(
                i / width,
                j / height,
                zoomData,
                width,
                height
            )

            if (zoom !== 256 * 255 && index !== 255 * 256) {
                if (tiles[index] !== undefined) {
                    if (!tiles[index].includes(zoom)) {
                        tiles[index].push(zoom)
                    }
                } else {
                    tiles[index] = [zoom]
                }
            }
        }
    }

    const tileResults = []
    for (let i in tiles) {
        let tile = tileTree.getNodeByID(i)

        let maxZ = tiles[i].sort()[tiles[i].length - 1]
        if (!tile) {
            console.log('tile not found', i)
        } else if (!tile.isLeaf()) {
            //console.log('not a leaf', tile.toString())
        } else if (tile.z > maxZ) {
            tileResults.push({ tile, tooHigh: true, maxZ })
            /*console.log(
                'tile: ' +
                    i +
                    ', zoom: ' +
                    tile.z +
                    ', go down in resolution to ' +
                    maxZ
            )*/
        } else if (tile.z < maxZ) {
            tileResults.push({ tile, tooLow: true, maxZ })
            /*console.log(
                'tile: ' +
                    i +
                    ', zoom: ' +
                    tile.z +
                    ', go up in resolution ' +
                    maxZ
            )*/
        } else {
            tileResults.push({ tile, justRight: true })
            /*console.log(
                'tile: ' + i + ', zoom: ' + tile.z + ', good resolution'
            )*/
        }
    }
    return tileResults
}

async function splitAllTiles(
    tileTree,
    scene,
    group,
    error,
    globeReference,
    material
) {
    return Promise.all(
        tileTree.getLeafNodes().map((node) => {
            return splitNode(
                node,
                scene,
                group,
                error,
                globeReference,
                material
            )
        })
    ).then(() => {
        window.tilesNeedUpdate = true
    })
}

async function splitNode(node, scene, group, error, globeReference, material) {
    node.split()
    const promises = node.getChildren().map(async (child) => {
        await child.getThreeMesh(error, globeReference.getMatrix(), material)
        return child
    })
    return Promise.all(promises).then((results) => {
        scene.remove(node.threeMesh)
        group.remove(node.bbox)
        for (let i in results) {
            scene.add(results[i].threeMesh)
            group.add(results[i].bbox)
        }
    })
}

async function combineAllTiles(
    tileTree,
    scene,
    group,
    error,
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
        await parent.getThreeMesh(error, globeReference.getMatrix(), material)
        return parent
    })
    Promise.all(promises)
        .then((parents) => {
            for (let i in parents) {
                let children = parents[i].getChildren()
                for (let j in children) {
                    scene.remove(children[j].threeMesh)
                    group.remove(children[j].bbox)
                    tileTree.removeNode(children[j])
                }
                scene.add(parents[i].threeMesh)
                group.add(parents[i].bbox)
            }
        })
        .then(() => {
            window.tilesNeedUpdate = true
        })
}

async function combineNode(
    id,
    tileTree,
    scene,
    error,
    globeReference,
    material
) {
    let node = tileTree.getNodeByID(id)

    let parent = node.getParent()
    await parent.getThreeMesh(error, globeReference.getMatrix(), material)

    let siblings = node.getSiblings()
    for (let i in siblings) {
        scene.remove(siblings[i].threeMesh)
        tileTree.removeNode(siblings[i])
    }

    scene.add(parent.threeMesh)
}

const updateMeshes = debounced(
    async (error, tileTree, globeReference, material) => {
        for (let tm of tileTree.getLeafNodes()) {
            tm.getThreeMesh(error, globeReference.getMatrix(), material)
        }
    },
    200,
    undefined,
    true
)

main()
