import * as THREE from "three";
import { getAndDecodeMapzenElevationTileFromLatLng } from "./mapzenTiles.js";
import mapboxMartini from "https://cdn.skypack.dev/@mapbox/martini";

//test
export async function testTerrain() {
  const elevation = await getAndDecodeMapzenElevationTileFromLatLng(
    35,
    -106,
    12
  );
  if (elevation.width != 256 || elevation.height != 256) {
    console.error("elevation array is not 256x256");
  } else if (Math.round(elevation.data[4]) !== 1908) {
    console.error("elevation at 4,4 is not 1908");
  } else {
    console.log("test passed");
  }
}
setTimeout(testTerrain, 1);

export async function testMartiniTerrain() {
  const elevation = await getAndDecodeMapzenElevationTileFromLatLng(
    35,
    -106,
    12
  );
  const elev257 = elevation.resample(257, 257);
  const rtin = new mapboxMartini(257);
  const tile = rtin.createTile(elev257.data);
  const mesh = tile.getMesh(1.2);
  const verticesXYZ = new Float32Array((mesh.vertices.length / 2) * 3);
  // combine elevation into vertices eg: [x,y,z,x,y,z,x,y,z,...] instead of [x,y,x,y,x,y,...]
  for (let i = 0; i < mesh.vertices.length; i += 2) {
    const x = mesh.vertices[i];
    const y = mesh.vertices[i + 1];
    const z = elev257.sample(x, y);
    const index = 3 * (i / 2);
    // set xyz
    // TODO remove the scale factors, which were just for testing
    verticesXYZ[index] = x / 256;
    verticesXYZ[index + 1] = y / 256;
    verticesXYZ[index + 2] = (z - 1890) / 100;
  }
  //   console.log({mesh, verticesXYZ});
  //
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(new THREE.BufferAttribute(mesh.triangles, 1));
  geometry.setAttribute("position", new THREE.BufferAttribute(verticesXYZ, 3));
  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
  });
  const terrainMesh = new THREE.Mesh(geometry, material);
  //   console.log(terrainMesh);
  return terrainMesh;
}
setTimeout(testMartiniTerrain, 1);
