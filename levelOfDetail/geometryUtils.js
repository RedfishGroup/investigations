import * as THREE from "three";

import { ecef_lla, lla_ecef } from "./ECEF.js";

function geometryFromElevationTile(tile, bounds, matrix = new THREE.Matrix4()) {
  if (
    tile &&
    tile.length === 256 * 256 &&
    bounds &&
    bounds.east !== undefined &&
    bounds.west !== undefined &&
    bounds.north !== undefined &&
    bounds.south !== undefined
  ) {
    let w = 256;
    let h = 256;

    let geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(w * h * 3 * 3), 3)
    );

    let faces = [];
    let vertices = [];
    for (let i = 0; i < w; i++) {
      for (let j = 0; j < h; j++) {
        let lat = (j / h) * (bounds.north - bounds.south) + bounds.south;
        let lon = (i / w) * (bounds.east - bounds.west) + bounds.west;
        let elev = tile[i * 256 + j];

        let [x, y, z] = lla_ecef(lat, lon, elev);
        let vec = new THREE.Vector3(x, y, z).applyMatrix3(matrix);

        vertices.push(vec.x, vec.y, vec.z);

        if (i < w - 1 && j < h - 1)
          faces.push(
            i * h + j,
            (i + 1) * h + j,
            i * h + (j + 1),

            i * h + (j + 1),
            (i + 1) * h + j,
            (i + 1) * h + (j + 1)
          );
      }
    }

    let count = 0;
    for (let i = 0; i < faces.length; i += 3) {
      for (let j = i; j < i + 3; j++) {
        let pos = vertices[faces[j]];
        geometry.attributes.position.setXYZ(count, pos.x, pos.y, pos.z);
        count++;
      }
    }

    geometry.attributes.position.needsUpdate = true;
    return geometry;
  }
}

export function geometryFromMartiniMesh(
  mesh,
  tile,
  bounds,
  matrix = new THREE.Matrix3()
) {
  if (mesh && bounds) {
    let { north, south, east, west } = bounds;

    let verticesXYZ = new Float32Array((mesh.vertices.length / 2) * 3);

    // tiles are always square
    let dim = tile.width;

    for (let i = 0; i < mesh.vertices.length; i += 2) {
      let mercX = mesh.vertices[i];
      let mercY = mesh.vertices[i + 1];

      let elev = tile.sample(mercX, dim - mercY - 1);

      let lon = (mercX / dim) * (east - west) + west;
      let lat = (mercY / dim) * (north - south) + south;

      let [x, y, z] = lla_ecef(lat, lon, elev);
      let vec = new THREE.Vector3(x, y, z).applyMatrix4(matrix);

      let index = 3 * (i / 2);
      verticesXYZ[index] = vec.x;
      verticesXYZ[index + 1] = vec.y;
      verticesXYZ[index + 2] = vec.z;
    }

    let geometry = new THREE.BufferGeometry();
    geometry.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
    geometry.setAttribute(
      "position",
      new THREE.BufferAttribute(verticesXYZ, 3)
    );

    return geometry;
  }
}
