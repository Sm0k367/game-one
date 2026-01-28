import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass, bloom, saturation, brightness } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    
    // 1. ENGINE SETTINGS FOR HIGH DEFINITION
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    // This prevents the "Cyan Soup" by allowing colors to get bright without losing detail
    renderer.toneMapping = THREE.AgXToneMapping; 
    renderer.toneMappingExposure = 0.8;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000103);
    scene.fog = new THREE.Fog(0x000103, 20, 150);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const saved = PersistenceManager.load('last_pos');
    camera.position.set(0, 6, saved ? saved.z : 100);

    // 2. POST-PROCESSING (THE "VISION" STACK)
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Selective Bloom: Only items with color > 1.0 will glow
    const bloomNode = bloom(scenePass, 1.5, 0.4, 0.9); 
    
    // Color Grading: Boost saturation to get those deep cyans and oranges
    const finalNode = saturation(brightness(scenePass.add(bloomNode), 0.1), 1.2);
    postProcessing.outputNode = finalNode;

    // 3. WORLD BUILDING
    createCinematicSun();
    createDetailMegaCity();
    createSharpGrid();
    createShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createCinematicSun() {
    // A Sun that actually "bleeds" light
    const sunGeo = new THREE.SphereGeometry(20, 64, 64);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(10, 10, 12); // Ultra-bright white/blue core
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 0, -250); 
    scene.add(sun);
}

function createDetailMegaCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ color: 0x000208 });
    
    // PROCEDURAL WINDOW SHADER
    // This creates the "dot" pattern from the vision instead of just lines
    material.emissiveNode = Fn(() => {
        const windows = positionLocal.xy.mul(15).fract().step(0.8);
        const floors = positionLocal.y.mul(10).fract().step(0.9);
        const neonColor = vec3(0.0, 5.0, 10.0); // Intense Cyan
        return neonColor.mul(windows).mul(floors).mul(tslTime.sin().add(2));
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, 1200);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 1200; i++) {
        const x = (Math.random() - 0.5) * 250;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 22) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(6, Math.random() * 80 + 10, 6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createSharpGrid() {
    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 200, 200);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    gridMat.colorNode = vec3(0.0, 1.0, 2.0); // Deep glowing blue
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createShip() {
    // Sleek fighter with orange thrusters
    const shipGeo = new THREE.BoxGeometry(2, 0.4, 3);
    const shipMat = new THREE.MeshStandardNodeMaterial({ color: 0x050505 });
    shipMat.emissiveNode = vec3(15, 3, 0); // Blinding orange engine
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate() {
    camera.position.z -= 0.6; // High-speed movement
    if (camera.position.z < -400) camera.position.z = 400;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 25, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 12) + 5, 0.1);
        ship.position.z = camera.position.z - 25;
        ship.rotation.z = (ship.position.x - (pointer.x * 25)) * -0.05;
    }

    postProcessing.render();
}

init();
