import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
// This is the specific path Vite/Vercel needs to see to bundle the Bloom effect correctly
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    // 1. Initialize Renderer with explicit WebGPU 
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Cinematic Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000205); 
    scene.fog = new THREE.Fog(0x000205, 10, 150);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const saved = PersistenceManager.load('last_pos');
    camera.position.set(0, 5, saved ? saved.z : 100);

    // 3. STABLE POST-PROCESSING CHAIN
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // In r171, we chain the bloom to the scenePass result
    const bloomNode = bloom(scenePass, 2.0, 0.5, 0.05); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    // 4. Create World Elements
    createHorizonSun();
    createMegaCity();
    createCyberGrid();
    createPlayerShip();

    // Input Listeners
    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop((time) => animate(time));
}

function createHorizonSun() {
    const sunGeo = new THREE.SphereGeometry(25, 32, 32);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    // Setting color > 1 trigger HDR bloom for that blinding white effect
    sunMat.colorNode = vec3(2.0, 2.0, 2.0); 
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 5, -250); 
    scene.add(sun);
}

function createMegaCity() {
    const count = 1500;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.0, 0.0, 0.02); 
    
    material.emissiveNode = Fn(() => {
        const stripeY = positionLocal.y.mul(15.0).fract().step(0.92);
        const neonColor = vec3(0.0, 1.0, 1.0); // Cyan
        return neonColor.mul(stripeY).mul(5.0); 
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 18) continue; 
        dummy.position.set(x, 0, z);
        dummy.scale.set(4, Math.random() * 70 + 5, 4);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createCyberGrid() {
    const gridGeo = new THREE.PlaneGeometry(600, 600, 120, 120);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    gridMat.colorNode = vec3(0.0, 0.4, 0.8).mul(tslTime.sin().add(1.5));
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createPlayerShip() {
    const shipGeo = new THREE.BoxGeometry(1.5, 0.4, 2.5);
    const shipMat = new THREE.MeshStandardNodeMaterial();
    shipMat.colorNode = vec3(0.05, 0.05, 0.05);
    shipMat.emissiveNode = vec3(1.0, 0.3, 0.0).mul(10); 
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate(time) {
    camera.position.z -= 0.35; 
    if (camera.position.z < -300) camera.position.z = 300;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 25, 0.08);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 12) + 5, 0.08);
        ship.position.z = camera.position.z - 15;
        ship.rotation.z = (ship.position.x - (pointer.x * 25)) * -0.05;
    }

    postProcessing.render();
}

init();
