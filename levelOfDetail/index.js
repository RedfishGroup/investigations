import * as THREE from "three";
import {getAndDecodeMapzenElevationTileFromLatLng} from "./elevationUtils.js"
function main() {
  // renderer setup
  const parent = document.querySelector("#threeDiv");
  const renderer = new THREE.WebGLRenderer();
  const bbox = parent.getBoundingClientRect();
  renderer.setSize(bbox.width, bbox.height);

  const canvas = renderer.domElement;
  canvas.onwheel = function (e) {
    e.preventDefault();
  };
  parent.appendChild(canvas);

  // camera setup
  const fov = 75;
  const aspect = canvas.width / canvas.height;
  const near = 0.1;
  const far = 5;
  const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
  camera.position.z = 2;

  document.body.onresize = function () {
    const bbox = parent.getBoundingClientRect();
    renderer.setSize(bbox.width, bbox.height);
    const aspect = canvas.width / canvas.height;
    camera.aspect = aspect;
    camera.updateMatrix();
    camera.updateProjectionMatrix();
  };

  const scene = new THREE.Scene();
  const boxWidth = 1;
  const boxHeight = 1;
  const boxDepth = 1;
  const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxDepth);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    wireframe: true,
  });
  const cube = new THREE.Mesh(geometry, material);
  scene.add(cube);
  renderer.setClearColor("#000000");
  renderer.setSize(window.innerWidth, window.innerHeight);
  const animate = function () {
    requestAnimationFrame(animate);
    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;
    renderer.render(scene, camera);
  };
  animate();
}

main();




//test
async function testTerrain(){
    const elevation = await getAndDecodeMapzenElevationTileFromLatLng(35,-106, 12)
    if(elevation.length !== 256*256){
        console.error("elevation array is not 256x256")
    } else if(Math.round(elevation[4]) !== 1908){
        console.error("elevation at 4,4 is not 1908")
    } else {
        console.log("test passed")
    }
}

setTimeout(testTerrain, 1)