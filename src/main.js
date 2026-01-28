import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, instancedMesh;
let lastSave = 0;

async function init() {
    // 1. Initialize Renderer with explicit Fallback
    renderer = new THREE.WebGPURenderer({ antialias: true });
    
    try {
        await renderer.init();
    } catch (e) {
        console.warn("WebGPU init failed, using WebGL fallback", e);
    }
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Scene Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.Fog(0x020202, 10, 60);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 5, savedState ? savedState.z : 10);
    camera.lookAt(0, 2, 0);

    // 3. Lighting (Crucial for WebGPU)
    const sun = new THREE.DirectionalLight(0x00ffcc, 5);
    sun.position.set(5, 10, 7);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // 4. Create the City
    createWorld();

    // 5. Action-Packed Loop
    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createWorld() {
    const gridSize = 60; // Slightly smaller for better mobile performance
    const spacing = 3;
    
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    
    // TSL Shader Logic: Reactive Building Heights
    material.positionNode = Fn(() => {
        return vec3(positionLocal.x, positionLocal.y.mul(2.0), positionLocal.z);
    })();

    material.colorNode = Fn(() => {
        const pulse = tslTime.sin().add(1.2).mul(0.5);
        return vec3(0.0, 1.0, 0.8).mul(pulse);
    })();

    instancedMesh = new THREE.InstancedMesh(geometry, material, gridSize * gridSize);
    const dummy = new THREE.Object3D();

    let i = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            dummy.position.set((x - gridSize / 2) * spacing, 0, (z - gridSize / 2) * spacing);
            const h = Math.random() * 8 + 1;
            dummy.scale.set(1.2, h, 1.2);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i++, dummy.matrix);
        }
    }

    scene.add(instancedMesh);
}

function animate(timestamp) {
    // Forward movement
    camera.position.z -= 0.15;

    // Infinite Loop logic
    if (camera.position.z < -80) camera.position.z = 80;

    // Auto-save
    if (timestamp - lastSave > 5000) {
        PersistenceManager.save('last_pos', { z: camera.position.z });
        lastSave = timestamp;
    }

    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
