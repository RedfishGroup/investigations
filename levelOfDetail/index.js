import * as THREE from "three";

import { GUI } from "https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js";
import { GlobeReference } from "./GlobeReference.js";
import { drawXYPlane, drawWorldAxes } from "./geoTools.js";

import { debounced } from "./debounced.js";

import { testMartiniTerrain } from "./tests.js";

import { geometryFromMartiniMesh } from "./geometryUtils.js";

import {
  getTileBounds,
  latLngToSlippyXYZ,
} from "./utils.js";
import { XYZTileNode } from "./XYZTileNode.js";

console.log(GUI);

async function main() {
  // renderer setup
  const parent = document.querySelector("#threeDiv");
  const renderer = new THREE.WebGLRenderer();
  const bbox = parent.getBoundingClientRect();
  renderer.setSize(bbox.width, bbox.height);
  renderer.setClearColor("#000000");

  // append renderer canvas to html div
  const canvas = renderer.domElement;
  canvas.onwheel = function (e) {
    e.preventDefault();
  };
  parent.appendChild(canvas);

  // camera setup
  const fov = 50;
  const aspect = canvas.width / canvas.height;
  const near = 0.01;
  const far = 5000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(2, 2, 1.5);
  camera.up.set(0, 0, 1);
  camera.updateMatrix();
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

  // orbit controls setup
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.maxDistance = 10;
  controls.maxPolarAngle = Math.PI / 2;

  // resize function for window
  document.body.onresize = function () {
    const bbox = parent.getBoundingClientRect();
    renderer.setSize(bbox.width, bbox.height);
    const aspect = canvas.width / canvas.height;
    camera.aspect = aspect;
    camera.updateMatrix();
    camera.updateProjectionMatrix();
  };

  // create scene
  const scene = new THREE.Scene();

  // put in axes
  drawWorldAxes(scene, 2);

  // put in x-y plane
  drawXYPlane(scene);

  // animation function
  const animate = function () {
    requestAnimationFrame(animate);

    controls.update();
    renderer.render(scene, camera);
  };

  const center = {
    Latitude: 35.19251772180017,
    Longitude: -106.42811011436379,
  };
  const zoom = 9;
  const [x, y, z] = latLngToSlippyXYZ(center.Latitude, center.Longitude, zoom);

  const bounds = getTileBounds(x, y, z);

  const globeReference = new GlobeReference({
    Latitude: bounds.center.lat,
    Longitude: bounds.center.lng,
    Elevation: 0,
    zoom,
  });

  let martiniParams = { error: 0 };

  let materialParams = {
    side: THREE.BackSide,
    wireframe: true,
  };
  const material = new THREE.MeshNormalMaterial(materialParams);

  const tileTree = new XYZTileNode(x, y, z, null);
  const threeMesh = await tileTree.getMesh(martiniParams.error, globeReference.getMatrix(), material);
  scene.add(threeMesh);

  // dat.gui menu setup
  const gui = new GUI();
  const materialGUI = gui.addFolder("Material");
  materialGUI.open();
  materialGUI.add(materialParams, "wireframe").onChange((bool) => {
    material.wireframe = bool;
    material.needsUpdate = true;
  });
  const martiniGUI = gui.addFolder("Martini");
  martiniGUI.open();
  martiniGUI.add(martiniParams, "error", 0, 20, 0.5).onChange((error) => {
    updateMeshes(error, scene, material, tileTree, globeReference);
  });

  // start animating
  animate();
}

const updateMeshes = debounced(
  async (error, scene, material, tileTree, globeReference) => {
    const tileMeshes = tileTree.getLeafNodes()
    console.log('tiles', tileMeshes);
    for (let i in tileMeshes) {
      const tileMesh = tileMeshes[i];
      // calculate new mesh
      if(tileMesh.mesh) {
        scene.remove(tileMesh.mesh);
      }
      let mesh = await tileMesh.getMesh(error, globeReference.getMatrix(), material);
      scene.add(mesh);
    }
  },
  200
);

main();
