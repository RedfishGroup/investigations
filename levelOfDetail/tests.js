import * as THREE from "three";
import { geometryFromMartiniMesh } from "./geometryUtils.js";
import {
  getAndDecodeTerrariumElevationTile,
  getAndDecodeMapzenElevationTileFromLatLng,
} from "./mapzenTiles.js";
import mapboxMartini from "https://cdn.skypack.dev/@mapbox/martini";
import { getTileBounds } from "./utils.js";

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

export async function testMartiniTerrain(x, y, z, matrix) {
  const elevation = await getAndDecodeTerrariumElevationTile(x, y, z);
  const elev257 = elevation.resample(257, 257);
  const rtin = new mapboxMartini(257);
  const tile = rtin.createTile(elev257.data);
  const mesh = tile.getMesh(1.2);

  const bounds = getTileBounds(x, y, z);
  console.log("tile bounds", bounds);

  const geometry = geometryFromMartiniMesh(mesh, elev257, bounds, matrix);

  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
  });
  const terrainMesh = new THREE.Mesh(geometry, material);
  //   console.log(terrainMesh);
  return terrainMesh;
}
setTimeout(testMartiniTerrain, 1);
