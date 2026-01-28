import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    
    // 1. SHARP RENDERER SETTINGS
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio); // Sharp lines
    // Crucial: No ToneMapping on the renderer so emissive values can go above 1.0
    renderer.toneMapping = THREE.NoToneMapping; 
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000105); // Near black

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 100);

    // 2. POST-PROCESSING (The "Sharp Neon" Config)
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    /**
     * Bloom Parameters for Sharpness:
     * Threshold: 1.0 (Only colors > 1.0 glow)
     * Strength: 1.5 (The "Punch")
     * Radius: 0.1 (Tight glow, not a blur)
     */
    const bloomNode = bloom(scenePass, 1.5, 0.1, 1.0); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    createHorizonSun();
    createSharpGrid();
    createMegaCity();
    createShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createHorizonSun() {
    const sunGeo = new THREE.SphereGeometry(15, 64, 64);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    // Color is 10x brighter than white to force a sharp halo
    sunMat.colorNode = vec3(10, 10, 10); 
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 2, -200); 
    scene.add(sun);
}

function createMegaCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ 
        color: 0x000000,
        metalness: 0,
        roughness: 1
    });
    
    // High-Intensity Neon Windows
    material.emissiveNode = Fn(() => {
        const stripeY = positionLocal.y.mul(10.0).fract().step(0.95);
        const neonColor = vec3(0.0, 10.0, 15.0); // Extreme HDR Cyan
        return neonColor.mul(stripeY);
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, 1000);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 250;
        const z = (Math.random() - 0.5) * 500;
        if (Math.abs(x) < 20) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(5, Math.random() * 80 + 10, 5);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createSharpGrid() {
    const gridGeo = new THREE.PlaneGeometry(800, 800, 160, 160);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    // HDR Blue (Values > 1.0)
    gridMat.colorNode = vec3(0.0, 2.0, 5.0); 
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createShip() {
    const shipGeo = new THREE.BoxGeometry(1.5, 0.4, 2.5);
    const shipMat = new THREE.MeshStandardNodeMaterial({ color: 0x111111 });
    shipMat.emissiveNode = vec3(20, 5, 0); // Blinding orange engine
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate() {
    camera.position.z -= 0.4;
    if (camera.position.z < -400) camera.position.z = 400;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 25, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 10) + 4, 0.1);
        ship.position.z = camera.position.z - 20;
    }

    postProcessing.render();
}

init();
