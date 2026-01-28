import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
// Explicit path for Vercel/Vite build compatibility
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();
const targetPos = new THREE.Vector3(0, 5, 0);

// HUD Elements
const speedEl = document.getElementById('speed-val');
const coordEl = document.getElementById('coord-val');

async function init() {
    // 1. ENGINE INITIALIZATION
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // AgX ToneMapping is key for that "filmic" neon look without washout
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 0.9;
    document.body.appendChild(renderer.domElement);

    // 2. SCENE & ATMOSPHERE
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000103);
    scene.fog = new THREE.Fog(0x000103, 20, 160);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const saved = PersistenceManager.load('last_pos');
    camera.position.set(0, 6, saved ? saved.z : 100);

    // 3. POST-PROCESSING (THE "NEON GLOW" STACK)
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Selective Bloom: High Threshold (0.9) ensures only neon lines glow
    const bloomNode = bloom(scenePass, 1.8, 0.2, 0.9); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    // 4. WORLD GENERATION
    createCinematicSun();
    createCyberGrid();
    createMegaCity();
    createPlayerShip();

    // 5. INPUT LISTENERS
    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createCinematicSun() {
    // Blinding white core at the horizon
    const sunGeo = new THREE.SphereGeometry(22, 64, 64);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(12.0, 12.0, 15.0); // HDR Overdrive
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 2, -280); 
    scene.add(sun);
}

function createMegaCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ color: 0x000208 });
    
    // PROCEDURAL WINDOW SHADER (TSL)
    material.emissiveNode = Fn(() => {
        // Creates a grid of small flickering dots/windows
        const windows = positionLocal.xy.mul(12).fract().step(0.85);
        const floors = positionLocal.y.mul(8).fract().step(0.9);
        const flicker = tslTime.mul(2).sin().add(2.0);
        const neonCyan = vec3(0.0, 6.0, 12.0); // Extreme HDR Cyan
        
        return neonCyan.mul(windows).mul(floors).mul(flicker);
    })();

    const count = 1500;
    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 260;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 22) continue; // Lane for the ship

        dummy.position.set(x, 0, z);
        dummy.scale.set(6, Math.random() * 90 + 10, 6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createCyberGrid() {
    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 250, 250);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    // Thin, glowing deep blue wires
    gridMat.colorNode = vec3(0.0, 0.5, 3.0); 
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createPlayerShip() {
    // Sleek cone jet
    const shipGeo = new THREE.ConeGeometry(0.8, 3.5, 4);
    shipGeo.rotateX(Math.PI / 2);
    
    const shipMat = new THREE.MeshStandardNodeMaterial({ color: 0x080808 });
    // Intense Orange Engine Flare
    shipMat.emissiveNode = vec3(20.0, 4.0, 0.0); 
    
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate() {
    // 1. ADVANCE WORLD
    camera.position.z -= 0.65; // High Speed travel
    if (camera.position.z < -400) camera.position.z = 400;

    // 2. SHIP MOVEMENT & BANKING
    if (ship) {
        targetPos.set(pointer.x * 28, (pointer.y * 12) + 6, camera.position.z - 25);
        ship.position.lerp(targetPos, 0.08);
        
        // Banking rotation (tilting when moving left/right)
        const tilt = (ship.position.x - targetPos.x) * -0.06;
        ship.rotation.z = THREE.MathUtils.lerp(ship.rotation.z, tilt, 0.1);
        ship.rotation.y = tilt * 0.5;
    }

    // 3. UPDATE HUD
    if (speedEl) speedEl.innerText = (0.85 + Math.random() * 0.02).toFixed(2);
    if (coordEl && ship) {
        coordEl.innerText = `${ship.position.x.toFixed(1)}, ${Math.abs(ship.position.z).toFixed(1)}`;
    }

    // 4. RENDER
    postProcessing.render();
}

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
