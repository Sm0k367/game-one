import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

/**
 * NEURAL STATE - World Engine v0.1.1
 * Updated: Persistence Integration & WebGPU Loop
 */

let renderer, scene, camera, instancedMesh;
let lastSave = 0;

async function init() {
    // 1. Initialize Adaptive WebGPU Renderer
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Scene & Persistence Check
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.Fog(0x020202, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Load saved position or default to start
    const savedState = PersistenceManager.load('last_pos');
    const startZ = savedState ? savedState.z : 10;
    camera.position.set(0, 5, startZ);
    camera.lookAt(0, 0, 0);

    // 3. Create the City
    createWorld();

    // 4. Start Render Loop (WebGPU standard passes timestamp)
    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createWorld() {
    const gridSize = 100;
    const spacing = 2;
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    
    // TSL Shader Logic for Pulsing City
    material.positionNode = Fn(() => {
        return vec3(positionLocal.x, positionLocal.y.mul(2.0), positionLocal.z);
    })();

    material.colorNode = Fn(() => {
        const pulse = tslTime.sin().add(1.0).mul(0.5);
        return vec3(0.0, 1.0, 0.8).mul(pulse);
    })();

    instancedMesh = new THREE.InstancedMesh(geometry, material, gridSize * gridSize);
    const dummy = new THREE.Object3D();

    let i = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            dummy.position.set((x - gridSize / 2) * spacing, 0, (z - gridSize / 2) * spacing);
            dummy.scale.set(1, Math.random() * 10 + 1, 1);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i++, dummy.matrix);
        }
    }

    scene.add(instancedMesh);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
}

function animate(timestamp) {
    // Action: Constant Forward Movement
    camera.position.z -= 0.1;

    // Reset if we fly too far
    if (camera.position.z < -100) camera.position.z = 100;

    // Persistence: Save state every 5 seconds
    if (timestamp - lastSave > 5000) {
        PersistenceManager.save('last_pos', { z: camera.position.z });
        lastSave = timestamp;
        console.log("Neural State: Position Synced.");
    }

    renderer.render(scene, camera);
}

// Responsive resizing
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init().catch(err => console.error("Neural State Init Failed:", err));
