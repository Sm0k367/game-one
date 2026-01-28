import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass, uniform, screenUV, float } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000810); // Deep Midnight Blue
    scene.fog = new THREE.Fog(0x000810, 10, 120);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const saved = PersistenceManager.load('last_pos');
    camera.position.set(0, 5, saved ? saved.z : 100);

    // POST-PROCESSING: THE "NEON HAZE" LOGIC
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // High-intensity bloom for the "blinding" look
    const bloomNode = bloom(scenePass, 2.5, 0.6, 0.05); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    // WORLD ELEMENTS
    createSun();
    createGrid();
    createMegaCity();
    createShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop((time) => animate(time));
}

function createSun() {
    // The "Sun" is a huge glowing sphere at the horizon
    const sunGeo = new THREE.SphereGeometry(15, 32, 32);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(1.0, 1.0, 1.0); // Blinding White
    
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 5, -150); // Locked at the horizon
    camera.add(sun); // Move with camera
    scene.add(camera);
}

function createMegaCity() {
    const count = 2000;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.005, 0.005, 0.02); // Pure Black/Blue
    
    // THE NEON STRIPES (TSL)
    material.emissiveNode = Fn(() => {
        const stripeY = positionLocal.y.mul(20.0).fract().step(0.95);
        const stripeX = positionLocal.x.mul(5.0).fract().step(0.9);
        const neonColor = vec3(0.0, 0.9, 1.0); // Cyan
        return neonColor.mul(stripeY.add(stripeX)).mul(2.0);
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 400;
        if (Math.abs(x) < 15) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(3, Math.random() * 50 + 5, 3);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createGrid() {
    const gridGeo = new THREE.PlaneGeometry(500, 500, 100, 100);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    gridMat.colorNode = vec3(0.0, 0.4, 0.8).mul(tslTime.sin().add(1.5));
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createShip() {
    const shipGeo = new THREE.BoxGeometry(2, 0.5, 3);
    const shipMat = new THREE.MeshStandardNodeMaterial();
    shipMat.colorNode = vec3(0.1, 0.1, 0.1);
    shipMat.emissiveNode = vec3(1.0, 0.3, 0.0).mul(5); // Orange Engines
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate(time) {
    camera.position.z -= 0.3; // High speed
    if (camera.position.z < -200) camera.position.z = 200;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 20, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 8) + 4, 0.1);
        ship.position.z = camera.position.z - 20;
        ship.rotation.z = (ship.position.x - (pointer.x * 20)) * -0.05;
    }

    postProcessing.render();
}

init();
