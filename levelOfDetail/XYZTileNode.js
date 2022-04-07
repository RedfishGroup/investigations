import { splitTileCoordinates, getTileBounds } from './utils.js'
import mapboxMartini from 'https://cdn.skypack.dev/@mapbox/martini'
import { getAndDecodeTerrariumElevationTile } from './mapzenTiles.js'
import { geometryFromMartiniMesh } from './geometryUtils.js'
import * as THREE from 'three'

/**
 *
 * A node in a tree of slippy tiles. Each node has up to 4 children. The children have a z index of one more than the parent.
 * The constructor takes the arguments x,y, z, and and optional parent.
 * The nodes have a link to the parent node. .There is a getParent function to get the parent of a node, which will create a node if it doesn't exist.
 * There is a helper function to create the children of a node called createChildren.
 * There is also a function to get the elevation of a node.
 * There is a helper function to get the ThreeJS geometry for a node, that takes the martiniError and a homeMatrix.
 *
 *
 * @class XYZTileNode
 *
 *
 *
 */

export class XYZTileNode {
    constructor(x, y, z, parent) {
        this.MAX_ZOOM = 16 // The maximum zoom level for the tiles
        this.x = x
        this.y = y
        this.z = z
        this.parent = parent
        this.children = []
        this.elevation = null
        this.mesh = null
        this._lastMArtiniError = null
    }

    getParent() {
        if (this.parent) {
            return this.parent
        } else {
            const parent = new XYZTileNode(
                Math.floor(this.x / 2),
                Math.floor(this.y / 2),
                this.z - 1,
                null
            )
            this.parent = parent
            return parent
        }
    }

    _createChildren() {
        // do not create children if we are at the max zoom
        if (this.z >= this.MAX_ZOOM) {
            return this.children
        }
        // create the four child nodes
        const children = splitTileCoordinates(this.x, this.y, this.z).map(
            (c) => {
                return new XYZTileNode(c.x, c.y, c.z, this)
            }
        )
        this.children = children
        return children
    }

    async getElevation() {
        if (!this.elevation) {
            const elevation = await getAndDecodeTerrariumElevationTile(
                this.x,
                this.y,
                this.z
            )
            const elev257 = await elevation.resample(257, 257)
            this.elevation = elev257
        }
        return this.elevation
    }

    getBounds() {
        const bounds = getTileBounds(this.x, this.y, this.z)
        return bounds
    }

    needsUpdate(martiniError) {
        if (this._lastMArtiniError !== martiniError) {
            this._lastMArtiniError = martiniError
            return true
        }
        if (!this.mesh) {
            return true
        }
        return false
    }

    async getGeometry(martiniError, homeMatrix) {
        console.log('needs update', this.toString())
        const bounds = this.getBounds()
        console.log('tile bounds', bounds)
        const rtin = new mapboxMartini(257)
        const elev = await this.getElevation()
        const tile = rtin.createTile(elev.data)
        const mesh = tile.getMesh(martiniError || 0.1)

        let geometry = geometryFromMartiniMesh(mesh, elev, bounds, homeMatrix)
        return geometry
    }

    async getMesh(martiniError, homeMatrix, material) {
        if (this.needsUpdate(martiniError)) {
            const geometry = await this.getGeometry(martiniError, homeMatrix)
            const mesh = new THREE.Mesh(geometry, material)
            this.mesh = mesh
        }
        return this.mesh
    }

    getLeafNodes() {
        if (this.children.length === 0) {
            return [this]
        } else {
            const leafNodes = []
            this.children.forEach((child) => {
                leafNodes.push(...child.getLeafNodes())
            })
            return leafNodes
        }
    }

    getNonLeafNodes() {
        if (this.children.length === 0) {
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

    split() {
        return this.getChildren()
    }

    getChildren() {
        if (this.children.length === 0) {
            this._createChildren()
        }
        return this.children
    }

    toString() {
        const allNodes = this.getAllNodesBelow()
        const nodeStrings = allNodes.map((node) => {
            return `[x:${node.x},y:${node.y},z:${node.z}]`
        })
        return nodeStrings.join(', ')
    }
}
