import {
  DataTexture,
  RGBAFormat,
  FloatType,
  NearestFilter,
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  WebGLRenderTarget,
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
} from "./js/three.module.js";
import { OrbitControls } from "./js/OrbitControls.module.js";

import { shader as simulationVertexShader } from "./simulation-vs.js";
import { shader as simulationFragmentShader } from "./simulation-fs.js";
import { shader as textureVertexShader } from "./texture-vs.js";
import { shader as textureFragmentShader } from "./texture-fs.js";
import { shader as clearVertexShader } from "./clear-vs.js";
import { shader as clearFragmentShader } from "./clear-fs.js";

var targets, simulationShader, textureShader, clearShader;
var rtScene, rtQuad, rtCamera;
var orthoScene, orthoMesh, orthoQuad, orthoCamera;
var targetPos = 0,
  targetTexture = 0;
var textureFBO;

const renderer = new WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
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

var width = isMobile.any ? 128 : 256;
var height = isMobile.any ? 128 : 256;

var data = new Float32Array(width * height * 4);

var r = 1;
for (var i = 0, l = width * height; i < l; i++) {
  var phi = Math.random() * 2 * Math.PI;
  var costheta = Math.random() * 2 - 1;
  var theta = Math.acos(costheta);
  r = 0.85 + 0.15 * Math.random();

  data[i * 4] = r * Math.sin(theta) * Math.cos(phi);
  data[i * 4 + 1] = r * Math.sin(theta) * Math.sin(phi);
  data[i * 4 + 2] = r * Math.cos(theta);
  data[i * 4 + 3] = Math.random() * 100; // frames life
}

var texture = new DataTexture(data, width, height, RGBAFormat, FloatType);
texture.minFilter = NearestFilter;
texture.magFilter = NearestFilter;
texture.needsUpdate = true;

var rtTexturePos = new WebGLRenderTarget(width, height, {
  wrapS: ClampToEdgeWrapping,
  wrapT: ClampToEdgeWrapping,
  minFilter: NearestFilter,
  magFilter: NearestFilter,
  format: RGBAFormat,
  type: FloatType,
  stencilBuffer: false,
  depthBuffer: false,
  generateMipmaps: false,
});

targets = [rtTexturePos, rtTexturePos.clone()];

simulationShader = new RawShaderMaterial({
  uniforms: {
    original: { value: texture },
    positions: { value: texture },
    time: { value: 0 },
  },
  vertexShader: simulationVertexShader,
  fragmentShader: simulationFragmentShader,
  side: DoubleSide,
});

rtScene = new Scene();
rtCamera = new OrthographicCamera(
  -width / 2,
  width / 2,
  -height / 2,
  height / 2,
  -500,
  1000
);
rtQuad = new Mesh(new PlaneBufferGeometry(width, height), simulationShader);
rtScene.add(rtQuad);

renderer.render(rtScene, rtCamera, rtTexturePos);

var pointsGeometry = new BufferGeometry();
var positions = new Float32Array(width * height * 3 * 3);
var ptr = 0;

for (var y = 0; y < height; y++) {
  for (var x = 0; x < width; x++) {
    positions[ptr] = x / width;
    positions[ptr + 1] = y / width;
    positions[ptr + 2] = 0;
    ptr += 3;
  }
}

pointsGeometry.setAttribute("position", new BufferAttribute(positions, 3));

var tex = createRenderTarget();

var texSize = 4096;
tex.setSize(texSize, texSize / 2);
textureFBO = [tex, tex.clone()];

textureFBO[0].texture.wrapS = textureFBO[0].texture.wrapT = RepeatWrapping;
textureFBO[1].texture.wrapS = textureFBO[1].texture.wrapT = RepeatWrapping;

textureShader = new RawShaderMaterial({
  uniforms: {
    time: { value: performance.now() },
    pointSize: { value: window.devicePixelRatio },
    positions: { value: textureFBO[targetTexture].texture },
    dimensions: { value: new Vector2(texSize, texSize / 2) },
  },
  vertexShader: textureVertexShader,
  fragmentShader: textureFragmentShader,
  side: DoubleSide,
  transparent: true,
});

orthoScene = new Scene();
orthoCamera = new OrthographicCamera(
  -tex.width / 2,
  tex.width / 2,
  -tex.height / 2,
  tex.height / 2,
  -1000,
  1000
);
orthoMesh = new Points(pointsGeometry, textureShader);
orthoScene.add(orthoMesh);

clearShader = new RawShaderMaterial({
  uniforms: {
    texture: { value: texture.texture },
  },
  vertexShader: clearVertexShader,
  fragmentShader: clearFragmentShader,
  side: DoubleSide,
  transparent: true,
});

orthoQuad = new Mesh(
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

onWindowResized();

window.addEventListener("resize", onWindowResized);

animate();

function onWindowResized(event) {
  var w = window.innerWidth;
  var h = window.innerHeight;

  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function animate() {
  renderer.setAnimationLoop(animate);

  controls.update();

  const t = 0.0001 * performance.now();
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
