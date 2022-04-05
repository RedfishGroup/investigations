import * as THREE from "three";
import { testMartiniTerrain } from "./tests.js";

import { drawWorldAxes } from "./geoTools.js";

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
  const fov = 75;
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 5000;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.set(2, 2, 1.5);
  camera.up.set(0, 0, 1);
  camera.updateMatrix();
  camera.updateProjectionMatrix();
  camera.lookAt(0, 0, 0);

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

  // create temp test mesh
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  let cube = new THREE.Mesh(geometry, material);
  window.cube = cube;
  scene.add(cube);

  // put in axes
  drawWorldAxes(scene, 2);

  // animation function
  const animate = function () {
    requestAnimationFrame(animate);
    //cube.rotation.x += 0.01;
    //cube.rotation.y += 0.01;
    cube.rotation.z += 0.01;
    renderer.render(scene, camera);
  };

  // martini test function for meshing tile
  testMartiniTerrain().then((terrainMesh) => {
    scene.remove(cube);
    scene.add(terrainMesh);
    cube = terrainMesh;
  });

  // start animating
  animate();
}

main();
