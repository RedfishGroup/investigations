import * as THREE from "three";

import { OrbitControls } from "https://unpkg.com/three@0.139.2/examples/jsm/controls/OrbitControls.js";
import { GlobeReference } from "./GlobeReference.js";
import { drawXYPlane, drawWorldAxes } from "./geoTools.js";

import { testMartiniTerrain } from "./tests.js";

import { getTileBounds, latLngToSlippyXYZ } from "./utils.js";

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
  const near = 0.1;
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

  const material = new THREE.MeshBasicMaterial({
    color: 0xffff00,
    wireframe: true,
  });

  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      // martini test function for meshing tile
      testMartiniTerrain(x + i, y + j, z, globeReference.getMatrix()).then(
        (terrainGeometry) => {
          // add martini terrain mesh
          scene.add(new THREE.Mesh(terrainGeometry, material));
        }
      );
    }
  }

  // start animating
  animate();
}

main();
