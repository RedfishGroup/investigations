import * as THREE from 'three'

import { GUI } from 'https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js'
import { OrbitControls } from 'https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js'

import { Frustum } from './Frustum.js'
import { GlobeReference } from './GlobeReference.js'
import { CalibratedCamera } from './CalibratedCamera.js'

import { debounced } from './debounced.js'

import {
    unpackPixel,
    renderToUint8Array,
    DepthShaderMaterial,
    TilePickingMaterial,
    TileIndexColorMaterial,
    ElevationShaderMaterial,
    TileNeedsUpdateMaterial,
    DepthColorShaderMaterial,
    RidgeLineShaderMaterial,
} from './materialUtils.js'

import { latLonToSlippyXYZ } from './utils.js'

import { XYZTileNode } from './XYZTileNode.js'

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
    controls.maxDistance = 20
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
    tileCam.lookAt(
        new THREE.Vector3().addVectors(
            new THREE.Vector3(0, 1, -0.1),
            tileCam.position
        )
    )
    tileCam.updateMatrix()
    tileCam.updateProjectionMatrix()

    // orthographic renderer setup
    const orthoRenderer = new THREE.WebGLRenderer()
    orthoRenderer.setSize(width, width)
    orthoRenderer.setClearColor('#000000')
    const orthoParent = document.querySelector('#orthoDiv')
    const orthoCanvas = orthoRenderer.domElement
    orthoCanvas.onwheel = function (e) {
        e.preventDefault()
    }
    orthoParent.appendChild(orthoCanvas)

    // orthographic camera setup
    const orthoCam = new THREE.OrthographicCamera(-10, 10, 10, -10, near, far)
    orthoCam.position.set(0, 0, 10)
    orthoCam.lookAt(0, 0, 0)
    orthoCam.updateMatrix()
    orthoCam.updateProjectionMatrix()

    // create scene
    const scene = new THREE.Scene()

    // group for putting terrain tiles in
    const terrainGroup = new THREE.Group()
    scene.add(terrainGroup)

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

    // camera viewing frustum
    const frustum = new Frustum({ far: 10, color: 0xff0000, camera: tileCam })
    frustum.renderOrder = 1000
    frustum.material.depthTest = false
    frustum.material.depthWrite = false
    frustum.updatePosition()

    group.add(frustum)

    const lookVector = new THREE.ArrowHelper(
        new THREE.Vector3(0, 1, -0.1),
        tileCam.position,
        20,
        0xff0000,
        0.3,
        0.2
    )
    lookVector.children[0].renderOrder = 1000
    lookVector.children[1].renderOrder = 1000
    lookVector.children[0].material.depthTest = false
    lookVector.children[1].material.depthTest = false
    lookVector.children[0].material.depthWrite = false
    lookVector.children[1].material.depthWrite = false

    group.add(lookVector)

    const center = {
        // Albuquerque
        Latitude: 35.19251772180017,
        Longitude: -106.42811011436379,

        // Shiprock
        //Latitude: 36.69165,
        //Longitude: -108.83866,

        // Everest
        // Latitude: 27.9881,
        // Longitude: 86.925,
    }
    const zoom = 9
    const [x, y, z] = latLonToSlippyXYZ(center.Latitude, center.Longitude, zoom)

    const globeReference = new GlobeReference({ x, y, z, scale: 10 })

    let martiniParams = { error: 0 }
    let materialParams = {
        color: 0xffaa00,
        wireframe: false,
    }
    let cameraParams = { angle: 0 }

    const depthMaterial = new DepthShaderMaterial(materialParams)
    const tileIndexMaterial = new TilePickingMaterial(materialParams)
    const elevationMaterial = new ElevationShaderMaterial(materialParams)
    const depthColorMaterial = new DepthColorShaderMaterial(materialParams)
    const tileIndexColorMaterial = new TileIndexColorMaterial(materialParams)
    const tileNeedsUpdateMaterial = new TileNeedsUpdateMaterial({
        fov: tileCam.vfov * (Math.PI / 180),
        scale: 1 / globeReference.getScale(),
        height,
        depthTexture: depthTarget.texture,
    })
    const ridgeLineMaterial = new RidgeLineShaderMaterial({
        width,
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
    terrainGroup.add(threeMesh)

    const skirtMesh = await tileTree.getSkirtMesh(
        globeReference.getMatrix(),
        elevationMaterial
    )
    terrainGroup.add(skirtMesh)

    // dat.gui menu setup
    const gui = new GUI()
    const materialGUI = gui.addFolder('Material')
    materialGUI.open()
    materialGUI.addColor(materialParams, 'color').onChange((color) => {
        elevationMaterial.setColor(color)
    })
    materialGUI.add(materialParams, 'wireframe').onChange((bool) => {
        elevationMaterial.wireframe = bool
    })
    materialGUI.add(bboxGroup, 'visible').name('bounding boxes')
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
                        terrainGroup,
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
                        terrainGroup,
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
    const camGUI = gui.addFolder('Camera')
    camGUI.open()
    camGUI.add(cameraParams, 'angle', 0, 2 * Math.PI).onChange((angle) => {
        let lookVec = new THREE.Vector3(0, 1, -0.1).applyAxisAngle(
            new THREE.Vector3(0, 0, 1),
            angle
        )
        tileCam.lookAt(
            new THREE.Vector3().addVectors(tileCam.position, lookVec)
        )
        tileCam.updateMatrix()
        tileCam.updateProjectionMatrix()
        frustum.updatePosition()
        lookVector.setDirection(lookVec)

        window.tilesNeedUpdate = true
    })

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

            // test
            updateTiles(indexData, zoomData)

            // set flag to false
            window.tilesNeedUpdate = false
        }

        scene.overrideMaterial = ridgeLineMaterial
        tileRenderer.render(scene, tileCam)
        scene.overrideMaterial = null

        group.visible = true
        if (reset) {
            bboxGroup.visible = true
        }

        // orthographic view render
        orthoRenderer.render(scene, orthoCam)

        // regular render
        renderer.render(scene, camera)

        requestAnimationFrame(animate)
    }

    window.busySplitting = false
    window.busyPruning = false
    const updateTiles = function (indexData, zoomData) {
        if (!window.busySplitting && !window.busyPruning) {
            const tileData = readTileData(
                tileTree,
                indexData,
                zoomData,
                tileCam.width,
                tileCam.height
            )

            splitTiles(tileData)
            pruneTiles(tileData)
        }
    }

    const splitTiles = async function (tileData) {
        if (!window.busySplitting) {
            window.busySplitting = true

            const promises = []

            // split
            const tooLow = tileData.tooLow
            for (let t in tooLow) {
                let result = tooLow[t]
                if (!result.tile.isBusy() && result.tile.canSplit()) {
                    promises.push(
                        splitNode(
                            result.tile,
                            terrainGroup,
                            bboxGroup,
                            martiniParams.error,
                            globeReference,
                            elevationMaterial
                        ).then(() => {
                            window.tilesNeedUpdate = true
                        })
                    )
                }
            }

            Promise.all(promises).then(() => {
                window.busySplitting = false
            })
        }
    }

    const pruneTiles = async function (tileData) {
        if (!window.busyPruning) {
            window.busyPruning = true

            const promises = []

            // prune
            const tilesThatAreTooLow = tileData.tooLow
            const tilesThatAreJustRight = tileData.justRight
            const tilesWithTooMuchDetail = tileData.tooHigh
            for (let t of tileTree.getLeafNodes()) {
                // if all siblings have too much detail then they are prunable
                const siblings = t.getSiblings()
                const canBePruned = siblings.every((s) => {
                    return (
                        s.isLeaf() &&
                        !tilesThatAreTooLow[s.id] &&
                        !tilesThatAreJustRight[s.id] &&
                        (!tileData.ids.includes(s.id) ||
                            tilesWithTooMuchDetail[s.id] !== undefined)
                    )
                })
                // make sure no siblings are busy
                const siblingsNotBusy = siblings.every((s) => !s.isBusy())
                if (canBePruned && siblingsNotBusy) {
                    // remove siblings and add parent's mesh
                    promises.push(
                        combineNode(
                            t.id,
                            tileTree,
                            terrainGroup,
                            bboxGroup,
                            martiniParams.error,
                            globeReference,
                            elevationMaterial
                        ).then(() => {
                            window.tilesNeedUpdate = true
                        })
                    )
                }
            }

            Promise.all(promises).then(() => {
                window.busyPruning = false
            })
        }
    }

    // start animating
    animate()
}

function readTileData(tileTree, indexData, zoomData, width, height) {
    let tiles = {}
    for (let j = height - 1; j >= 0; j--) {
        for (let i = width - 1; i >= 0; i--) {
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
                    if (tiles[index] < zoom) {
                        tiles[index] = zoom
                    }
                } else {
                    tiles[index] = zoom
                }
            }
        }
    }

    const tileResults = { ids: [], tooHigh: {}, tooLow: {}, justRight: {} }
    for (let i in tiles) {
        let tile = tileTree.getNodeByID(i)

        if (i == 0) {
            // This happens when an object does not have a tile ID. This is fine. The skirts dont have ids.
            // console.log('id is 0')
        } else if (!tile) {
            console.log('tile not found', i)
        } else if (!tile.isLeaf()) {
            console.log('not a leaf', tile.toString())
        } else if (tile.z > tiles[i]) {
            tileResults.ids.push(Number(i))
            tileResults.tooHigh[i] = { tile, zoom: tiles[i] }
        } else if (tile.z < tiles[i]) {
            tileResults.ids.push(Number(i))
            tileResults.tooLow[i] = { tile, zoom: tiles[i] }
        } else {
            tileResults.ids.push(Number(i))
            tileResults.justRight[i] = { tile }
        }
    }
    return tileResults
}

async function splitAllTiles(
    tileTree,
    terrainGroup,
    bboxGroup,
    error,
    globeReference,
    material
) {
    return Promise.all(
        tileTree.getLeafNodes().map((node) => {
            if(!node.canSplit()){
                return undefined
            }
            return splitNode(
                node,
                terrainGroup,
                bboxGroup,
                error,
                globeReference,
                material
            ).then(() => {
                window.tilesNeedUpdate = true
            })
        })
    ).then(() => {
        // window.tilesNeedUpdate = true
    })
}

async function splitNode(
    node,
    terrainGroup,
    bboxGroup,
    error,
    globeReference,
    material
) {
    node.split()
    const promises = node.getChildren().map(async (child) => {
        await child.getThreeMesh(error, globeReference.getMatrix(), material)
        await child.getSkirtMesh(globeReference.getMatrix(), material)
        return child
    })
    try {
        const results = await Promise.all(promises)
        terrainGroup.remove(node.threeMesh)
        terrainGroup.remove(node.skirtMesh)
        bboxGroup.remove(node.bbox)
        for (let i in results) {
            terrainGroup.add(results[i].threeMesh)
            terrainGroup.add(results[i].skirtMesh)
            bboxGroup.add(results[i].bbox)
        }
        return results
    } catch (err) {
        node.MAX_ZOOM = node.z 
        node.getChildren().forEach((child) => {
            child.removeNode()
        })
        console.warn(err)
    }
}

async function combineAllTiles(
    tileTree,
    terrainGroup,
    bboxGroup,
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
        await parent.getSkirtMesh(globeReference.getMatrix(), material)
        return parent
    })
    Promise.all(promises).then((parents) => {
        for (let i in parents) {
            let children = parents[i].getChildren()
            for (let j in children) {
                terrainGroup.remove(children[j].threeMesh)
                terrainGroup.remove(children[j].skirtMesh)
                bboxGroup.remove(children[j].bbox)
                tileTree.removeNode(children[j])
            }
            terrainGroup.add(parents[i].threeMesh)
            terrainGroup.add(parent[i].skirtMesh)
            bboxGroup.add(parents[i].bbox)
        }
        window.tilesNeedUpdate = true
    })
}

async function combineNode(
    id,
    tileTree,
    terrainGroup,
    bboxGroup,
    error,
    globeReference,
    material
) {
    // make sure that node exists, and that
    // parent exists, because we don't want
    // to remove the parent if it is the
    // first tile
    let node = tileTree.getNodeByID(id)
    let parent = node && node.parent
    if (node && parent) {
        await parent.getThreeMesh(error, globeReference.getMatrix(), material)
        await parent.getSkirtMesh(globeReference.getMatrix(), material)

        let siblings = node.getSiblings()
        for (let i in siblings) {
            terrainGroup.remove(siblings[i].threeMesh)
            terrainGroup.remove(siblings[i].skirtMesh)
            bboxGroup.remove(siblings[i].bbox)
            tileTree.removeNode(siblings[i])
        }

        terrainGroup.add(parent.threeMesh)
        terrainGroup.add(parent.skirtMesh)
        bboxGroup.add(parent.bbox)
    }
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
