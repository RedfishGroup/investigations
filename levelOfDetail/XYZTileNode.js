import { splitTileCoordinates, getTileBounds, padDataSetMaintainSlope } from './utils.js'
import mapboxMartini from 'https://cdn.skypack.dev/@mapbox/martini'
import { getAndDecodeTerrariumElevationTile } from './mapzenTiles.js'
import { geometryFromMartiniMesh } from './geometryUtils.js'
import * as THREE from 'three'

/**
 *   A tree structure to hold slippy tiles, and their 3d meshes.
 *
 * A node in a tree of slippy tiles. Each node has up to 4 children. The children have a z index of one more than the parent.
 * The constructor takes the arguments x,y, z, and and optional parent.
 *
 *
 * @class XYZTileNode
 *
 *
 */

export class XYZTileNode {

    static nodeIDLookup = {}
    static nodeCount = 0

    /**
     *
     * @param {Number} x
     * @param {Number} y
     * @param {Number} z
     * @param {XYZTileNode} parent
     */
    constructor(x, y, z, parent) {
        this.MAX_ZOOM = 16 // The maximum zoom level for the tiles
        this.x = x
        this.y = y
        this.z = z
        this.PAD_SIDES_TO_REMOVE_SEAMS = true
        this.parent = parent
        this.children = []
        this.elevation = null
        this.threeMesh = null
        this._lastMArtiniError = null
        this.id = XYZTileNode.nodeCount
        XYZTileNode.nodeCount = XYZTileNode.nodeCount + 1
        XYZTileNode.nodeIDLookup[this.id] = this
    }


    /**
     *  Lookup nodes in the tree by the xyz coordinates of the tile.
     * 
     * @param {Number} x 
     * @param {Number} y 
     * @param {Number} z 
     * @param {XYZTileNode} node 
     * @returns Object {found: Boolean, node: XYZTileNode}
     */
    lookupNodeByXYZ(x, y, z, node = this) {
        if (node.x === x && node.y === y && node.z === z) {
            return { found: true, node: node }
        }
        const xChoice = Math.floor(x / (2 ** (z - node.z - 1)))
        const yChoice = Math.floor(y / (2 ** (z - node.z - 1)))
        const child = node.children.find(child => child.x === xChoice && child.y === yChoice)
        if (child) {
            return this.lookupNodeByXYZ(x, y, z, child)
        } else {
            return { found: false, node: node }
        }
    }

    getRoot() {
        if (this.parent) {
            return this.parent.getRoot()
        } else {
            return this
        }
    }

    // getNeighbors4() {
    //     const root = this.getRoot()
    //     const neighbors = [this.lookupNodeByXYZ(this.x, this.y - 1, this.z, root)
    //         , this.lookupNodeByXYZ(this.x, this.y + 1, this.z, root)
    //         , this.lookupNodeByXYZ(this.x - 1, this.y, this.z, root)
    //         , this.lookupNodeByXYZ(this.x + 1, this.y, this.z, root)]
    //     const neighborLeafs = neighbors.filter(neighbor => neighbor.node.isLeaf())
    //     return neighborLeafs
    // }

    isLeaf() {
        return this.children.length === 0
    }
    /**
     * 
     * @param {String} id 
     * @returns 
     */
    getNodeByID(id) {
        return nodeIDLookup[id]
    }

    _createChildren() {
        // do not create children if we are at the max zoom
        if (this.z >= this.MAX_ZOOM) {
            return this.children
        }
        // create the four child nodes
        const children = splitTileCoordinates(this.x, this.y, this.z).map(
            (c) => {
                const childExists = this.children.find((child) => {
                    child.x === c.x && child.y === c.y && child.z === c.z
                })
                if (childExists) {
                    return childExists
                } else {
                    return new XYZTileNode(c.x, c.y, c.z, this)
                }
            }
        )
        this.children = children
        return children
    }

    /**
     * Get the elevation Dataset for this node.
     * @returns {DataSet}
     */
    async getElevation() {
        if (!this.elevation) {
            const elevation = await getAndDecodeTerrariumElevationTile(
                this.x,
                this.y,
                this.z
            )
            if (this.PAD_SIDES_TO_REMOVE_SEAMS) {
                const elev255 = await elevation.resample(255, 255)
                const elev257 = padDataSetMaintainSlope(elev255)
                this.elevation = elev257
            } else {
                this.elevation = await elevation.resample(257, 257)
            }

        }
        return this.elevation
    }

    /**
     * Get bounds for this node.
     * 
     * @returns {LatLngBounds}
     */
    getBounds() {
        const bounds = getTileBounds(this.x, this.y, this.z)
        if (this.PAD_SIDES_TO_REMOVE_SEAMS) {
            // stretch the bounds to the edge of the tile. This is to minimize gaps in the mesh.
            const latPadding = (bounds.north - bounds.south) / (257)
            const lngPadding = (bounds.east - bounds.west) / (257)
            bounds.north = bounds.north + latPadding
            bounds.south = bounds.south - latPadding
            bounds.east = bounds.east + lngPadding
            bounds.west = bounds.west - lngPadding
        }
        return bounds
    }

    /**
     * Get TIN from martini mesh
     * @param {Number} martiniError
     * @returns
     */
    async getMartiniMesh(martiniError) {
        console.log('needs update', this.toString())
        const rtin = new mapboxMartini(257)
        const elev = await this.getElevation()
        const tile = rtin.createTile(elev.data)
        const mesh = tile.getMesh(martiniError || 0.1)
        return mesh
    }

    /**
     * Create and uppdate the 3d mesh for this node.
     *
     * @param {Number} martiniError
     * @param {THREE.Matrix4} homeMatrix
     * @param {THREE.Material} material
     * @returns {THREE.Mesh}
     */
    async getThreeMesh(martiniError, homeMatrix, material) {
        if (this.needsUpdate(martiniError)) {
            const bounds = this.getBounds()
            console.log('tile bounds', bounds)
            const marty = await this.getMartiniMesh(martiniError, homeMatrix)
            let geometry = geometryFromMartiniMesh(
                marty,
                this.elevation,
                bounds,
                homeMatrix
            )
            const mesh = new THREE.Mesh(geometry, material)
            this.threeMesh = mesh
        }
        return this.threeMesh
    }

    /**
     *
     * @returns {[XYZTileNode, XYZTileNode, ...]}
     */
    getLeafNodes() {
        if (this.isLeaf()) {
            return [this]
        } else {
            const leafNodes = []
            this.children.forEach((child) => {
                leafNodes.push(...child.getLeafNodes())
            })
            return leafNodes
        }
    }

    /**
     *
     * @returns {[XYZTileNode, XYZTileNode, ...]}
     */
    getNonLeafNodes() {
        if (this.isLeaf()) {
            return []
        } else {
            const nonLeafNodes = [this]
            this.children.forEach((child) => {
                nonLeafNodes.push(...child.getNonLeafNodes())
            })
            return nonLeafNodes
        }
    }

    getAllNodesBelow() {
        const nodes = [this]
        this.children.forEach((child) => {
            nodes.push(...child.getAllNodesBelow())
        })
        return nodes
    }

    /**
     * Get all the children of this node, and create them if they don't exist.
     * @returns {[XYZTileNode, XYZTileNode, ...]}
     */
    split() {
        return this.getChildren()
    }

    /**
     * Get all the children of this node, and create them if they don't exist.
     * @returns {[XYZTileNode, XYZTileNode, ...]}
     */
    getChildren() {
        if (this.children.length === 0) {
            this._createChildren()
        }
        return this.children
    }

    needsUpdate(martiniError) {
        if (this._lastMArtiniError !== martiniError) {
            this._lastMArtiniError = martiniError
            return true
        }
        if (!this.threeMesh) {
            return true
        }
        return false
    }

    toString() {
        const allNodes = this.getAllNodesBelow()
        const nodeStrings = allNodes.map((node) => {
            return `[x:${node.x},y:${node.y},z:${node.z}, id:${node.id}]`
        })
        return nodeStrings.join(', ')
    }
}
