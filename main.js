import {
  DataTexture,
  RGBAFormat,
  FloatType,
  NearestFilter,
  WebGL1Renderer,
  Scene,
  PerspectiveCamera,
  WebGLRenderTarget,
  Raycaster,
  ClampToEdgeWrapping,
  RawShaderMaterial,
  Vector2,
  Vector3,
  DoubleSide,
  OrthographicCamera,
  Mesh,
  PlaneBufferGeometry,
  IcosahedronBufferGeometry,
  MeshBasicMaterial,
  BufferGeometry,
  BufferAttribute,
  Points,
  RepeatWrapping,
  HalfFloatType,
} from "./js/three.module.js";
import { OrbitControls } from "./js/OrbitControls.module.js";

import { shader as simulationVertexShader } from "./simulation-vs.js";
import { shader as simulationFragmentShader } from "./simulation-fs.js";
import { shader as textureVertexShader } from "./texture-vs.js";
import { shader as textureFragmentShader } from "./texture-fs.js";
import { shader as clearVertexShader } from "./clear-vs.js";
import { shader as clearFragmentShader } from "./clear-fs.js";

import { canDoFloatLinear } from "./settings.js";

const renderer = new WebGL1Renderer({
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0, 1);
document.body.append(renderer.domElement);

const scene = new Scene();

const camera = new PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
camera.target = new Vector3(0, 0, 0);
camera.lookAt(camera.target);
scene.add(camera);

camera.position.set(0, 0, 90);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;

const isMobile = {
  any: false,
};

function createRenderTarget() {
  return new WebGLRenderTarget(1, 1, {
    wrapS: ClampToEdgeWrapping,
    wrapT: ClampToEdgeWrapping,
    format: RGBAFormat,
    stencilBuffer: false,
    depthBuffer: true,
  });
}

const width = isMobile.any ? 128 : 256;
const height = isMobile.any ? 128 : 256;

const data = new Float32Array(width * height * 4);

let r = 1;
for (let i = 0, l = width * height; i < l; i++) {
  const phi = Math.random() * 2 * Math.PI;
  const costheta = Math.random() * 2 - 1;
  const theta = Math.acos(costheta);
  r = 0.85 + 0.15 * Math.random();

  data[i * 4] = r * Math.sin(theta) * Math.cos(phi);
  data[i * 4 + 1] = r * Math.sin(theta) * Math.sin(phi);
  data[i * 4 + 2] = r * Math.cos(theta);
  data[i * 4 + 3] = Math.random() * 100; // frames life
}

const texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
texture.minFilter = NearestFilter;
texture.magFilter = NearestFilter;
texture.needsUpdate = true;

const rtTexturePos = new WebGLRenderTarget(width, height, {
  wrapS: ClampToEdgeWrapping,
  wrapT: ClampToEdgeWrapping,
  minFilter: NearestFilter,
  magFilter: NearestFilter,
  format: RGBAFormat,
  type: canDoFloatLinear() ? FloatType : HalfFloatType,
  stencilBuffer: false,
  depthBuffer: false,
  generateMipmaps: false,
});

const targets = [rtTexturePos, rtTexturePos.clone()];

const simulationShader = new RawShaderMaterial({
  uniforms: {
    original: { value: texture },
    positions: { value: texture },
    pointer: { value: new Vector3() },
    time: { value: 0 },
  },
  vertexShader: simulationVertexShader,
  fragmentShader: simulationFragmentShader,
  side: DoubleSide,
});

const rtScene = new Scene();
const rtCamera = new OrthographicCamera(
  -width / 2,
  width / 2,
  -height / 2,
  height / 2,
  -500,
  1000
);
const rtQuad = new Mesh(
  new PlaneBufferGeometry(width, height),
  simulationShader
);
rtScene.add(rtQuad);

renderer.setRenderTarget(rtTexturePos);
renderer.render(rtScene, rtCamera);
renderer.setRenderTarget(null);

const pointsGeometry = new BufferGeometry();
const positions = new Float32Array(width * height * 3 * 3);
let ptr = 0;

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    positions[ptr] = x / width;
    positions[ptr + 1] = y / width;
    positions[ptr + 2] = 0;
    ptr += 3;
  }
}

pointsGeometry.setAttribute("position", new BufferAttribute(positions, 3));

const tex = createRenderTarget();

const texSize = 4096;
tex.setSize(texSize, texSize / 2);
const textureFBO = [tex, tex.clone()];

textureFBO[0].texture.wrapS = textureFBO[0].texture.wrapT = RepeatWrapping;
textureFBO[1].texture.wrapS = textureFBO[1].texture.wrapT = RepeatWrapping;

let targetTexture = 0;

const textureShader = new RawShaderMaterial({
  uniforms: {
    time: { value: performance.now() },
    colorise: { value: 0 },
    pointer: { value: new Vector3() },
    pointSize: { value: window.devicePixelRatio },
    positions: { value: textureFBO[targetTexture].texture },
    dimensions: { value: new Vector2(texSize, texSize / 2) },
  },
  vertexShader: textureVertexShader,
  fragmentShader: textureFragmentShader,
  side: DoubleSide,
  transparent: true,
});

const orthoScene = new Scene();
const orthoCamera = new OrthographicCamera(
  -tex.width / 2,
  tex.width / 2,
  -tex.height / 2,
  tex.height / 2,
  -1000,
  1000
);
const orthoMesh = new Points(pointsGeometry, textureShader);
orthoScene.add(orthoMesh);

const clearShader = new RawShaderMaterial({
  uniforms: {
    texture: { value: texture.texture },
  },
  vertexShader: clearVertexShader,
  fragmentShader: clearFragmentShader,
  side: DoubleSide,
  transparent: true,
});

const orthoQuad = new Mesh(
  new PlaneBufferGeometry(tex.width, tex.height),
  clearShader
);
orthoScene.add(orthoQuad);

const sphere = new Mesh(
  new IcosahedronBufferGeometry(100, 5),
  new MeshBasicMaterial({
    map: tex.texture,
    transparent: !true,
    side: DoubleSide,
  })
);
scene.add(sphere);

const raycaster = new Raycaster();
const mouse = new Vector2();

renderer.domElement.addEventListener("pointermove", (e) => {
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
});

document.querySelector("#toggle_color").addEventListener("click", (e) => {
  textureShader.uniforms.colorise.value =
    1 - textureShader.uniforms.colorise.value;
});

function onWindowResized(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let targetPos = 0;

function animate() {
  renderer.setAnimationLoop(animate);

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(sphere);
  if (intersects.length) {
    textureShader.uniforms.pointer.value.copy(intersects[0].point);
    simulationShader.uniforms.pointer.value.copy(intersects[0].point);
  }

  const t = 0.0001 * performance.now();

  sphere.rotation.y = -0.1 * t;

  simulationShader.uniforms.time.value = t;
  simulationShader.uniforms.positions.value = targets[targetPos].texture;
  targetPos = 1 - targetPos;
  renderer.setRenderTarget(targets[targetPos]);
  renderer.render(rtScene, rtCamera);

  renderer.autoClear = false;

  orthoQuad.visible = true;
  orthoMesh.visible = false;
  clearShader.uniforms.texture.value = textureFBO[targetTexture].texture;
  targetTexture = 1 - targetTexture;
  renderer.setRenderTarget(textureFBO[targetTexture]);
  renderer.render(orthoScene, orthoCamera);
  textureShader.uniforms.time.value = t;
  textureShader.uniforms.positions.value = targets[targetPos].texture;
  orthoQuad.visible = false;
  orthoMesh.visible = true;
  renderer.setRenderTarget(textureFBO[targetTexture]);
  renderer.render(orthoScene, orthoCamera);
  renderer.autoClear = true;

  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

onWindowResized();

window.addEventListener("resize", onWindowResized);

animate();
