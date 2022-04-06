import * as THREE from "three";

import { GUI } from "https://unpkg.com/dat.gui@0.7.7/build/dat.gui.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js";
import { GlobeReference } from "./GlobeReference.js";
import { drawXYPlane, drawWorldAxes } from "./geoTools.js";

import { testMartiniTerrain } from "./tests.js";

import { verticesFromMartiniMesh } from "./geometryUtils.js";

import { getTileBounds, latLngToSlippyXYZ } from "./utils.js";

console.log(GUI);

function main() {
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
  const zoom = 12;
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

  const results = [];
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      // martini test function for meshing tile
      testMartiniTerrain(x + i, y + j, z, {
        error: martiniParams.error,
        matrix: globeReference.getMatrix(),
      }).then((result) => {
        // add martini terrain mesh
        results.push(result);
        scene.add(new THREE.Mesh(result.geometry, material));
      });
    }
  }

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
  martiniGUI.add(martiniParams, "error", 0, 100, 1).onChange(() => {
    for (let i in results) {
      // calculate new mesh
      let mesh = results[i].tile.getMesh(martiniParams.error);

      // set position
      let vertices = verticesFromMartiniMesh(
        mesh,
        results[i].elevation,
        results[i].bounds,
        globeReference.getMatrix()
      );
      results[i].geometry.attributes.position.array = vertices;
      results[i].geometry.attributes.position.needsUpdate = true;

      // set indices
      results[i].geometry.index.array = mesh.triangles;
      results[i].geometry.index.needsUpdate = true;

      // set draw range
      results[i].geometry.setDrawRange(0, mesh.triangles.length);

      //results[i].geometry.computeVertexNormals();
    }
  });

  // start animating
  animate();
}

main();
