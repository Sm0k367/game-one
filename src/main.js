import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    
    // SHARP RENDERER: Full resolution, no blur
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ReinhardToneMapping; // Prevents "Cyan Soup" washout
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000105); // Almost pure black

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 100);

    // SELECTIVE POST-PROCESSING
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Strength: 1.0 (Balanced), Radius: 0.1 (Sharp), Threshold: 0.9 (Only Neon Glows)
    const bloomNode = bloom(scenePass, 1.0, 0.1, 0.9); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    createHorizonSun();
    createCyberGrid();
    createMegaCity();
    createShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createHorizonSun() {
    const sunGeo = new THREE.CircleGeometry(10, 64); // Flat circle for sharper horizon look
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(2, 2, 2); // Bright white core
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, 2, -180); 
    scene.add(sun);
}

function createMegaCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ 
        color: 0x000205,
        roughness: 1,
        metalness: 0
    });
    
    // SHARP NEON STRIPES
    material.emissiveNode = Fn(() => {
        const stripeY = positionLocal.y.mul(10).fract().step(0.95);
        const neonColor = vec3(0.0, 5.0, 8.0); // Cyan intensity
        return neonColor.mul(stripeY);
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, 1000);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 500;
        if (Math.abs(x) < 20) continue; 
        dummy.position.set(x, 0, z);
        dummy.scale.set(4, Math.random() * 80 + 10, 4);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createCyberGrid() {
    const gridGeo = new THREE.PlaneGeometry(800, 800, 150, 150);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    // Keep grid lines thin and glowing blue
    gridMat.colorNode = vec3(0.0, 0.5, 1.0).mul(2); 
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createShip() {
    const shipGeo = new THREE.ConeGeometry(0.8, 3, 4);
    shipGeo.rotateX(Math.PI / 2);
    const shipMat = new THREE.MeshStandardNodeMaterial({ color: 0x111111 });
    shipMat.emissiveNode = vec3(10, 2, 0); // Orange Thrusters
    ship = new THREE.Mesh(shipGeo, shipMat);
    scene.add(ship);
}

function animate() {
    camera.position.z -= 0.5; // Fast travel
    if (camera.position.z < -400) camera.position.z = 400;

    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 25, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 10) + 4, 0.1);
        ship.position.z = camera.position.z - 20;
    }

    postProcessing.render();
}

init();
