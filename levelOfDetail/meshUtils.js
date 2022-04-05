import * as THREE from "three";

function meshFromElevationTile(tile, bounds, matrix = new THREE.Matrix3()) {
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

        let [x, y, z] = ecef.lla_ecef(lat, lon, elev);
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
    let material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    return new THREE.Mesh(geometry, material);
  }
}
