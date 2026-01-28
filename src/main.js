import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, uv, float } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing;
let lastSave = 0;

async function init() {
    // 1. Core WebGPU Setup
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Scene Aesthetic
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020308); // Deep Cyber-Blue
    scene.fog = new THREE.Fog(0x020308, 20, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 4, savedState ? savedState.z : 50);

    // 3. Post-Processing (The "Mind-Blowing" Glow)
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = postProcessing.addScenePass(scene, camera);
    
    // Add Bloom for that Neon "GTA-Future" look
    const bloom = postProcessing.addBloomPass();
    bloom.strength = 1.5;
    bloom.radius = 0.5;

    // 4. World Geometry
    createGrid();
    createBuildings();

    // 5. Lighting
    const neonSun = new THREE.DirectionalLight(0x00ffff, 10);
    neonSun.position.set(0, 10, -50);
    scene.add(neonSun);

    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createGrid() {
    // Persistent Wireframe Floor
    const gridGeo = new THREE.PlaneGeometry(200, 200, 50, 50);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    
    // TSL logic to make the grid "pulse" with the music of the city
    gridMat.colorNode = Fn(() => {
        const dist = positionLocal.z.add(tslTime.mul(5.0)).fract();
        return vec3(0.0, 0.2, 0.5).mul(dist);
    })();

    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createBuildings() {
    const count = 1500;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // The "Neural" Material - Glowing Windows
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.01, 0.01, 0.05); // Dark base
    
    // Emissive logic using TSL (Creates the neon stripes)
    material.emissiveNode = Fn(() => {
        const stripes = positionLocal.y.mul(10.0).fract().step(0.8);
        return vec3(0.0, 1.0, 1.0).mul(stripes).mul(tslTime.sin().add(1.5));
    })();

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 100;
        const z = (Math.random() - 0.5) * 200;
        if (Math.abs(x) < 8) continue; // Keep a "Highway" clear in the middle

        dummy.position.set(x, 0, z);
        dummy.scale.set(2, Math.random() * 20 + 2, 2);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
}

function animate(timestamp) {
    camera.position.z -= 0.15; // Smooth fly-through
    if (camera.position.z < -100) camera.position.z = 100;

    // Persistence save
    if (timestamp - lastSave > 5000) {
        PersistenceManager.save('last_pos', { z: camera.position.z });
        lastSave = timestamp;
    }

    postProcessing.render();
}

init();
