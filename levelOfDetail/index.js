import * as THREE from "three";

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
