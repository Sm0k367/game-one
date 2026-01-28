import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
// EXPLICIT ADDON IMPORT - Required for Vercel/Vite build success
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing;
let lastSave = 0;

async function init() {
    // 1. Initialize Renderer
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010205);
    scene.fog = new THREE.Fog(0x010205, 15, 95);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 5, savedState ? savedState.z : 50);
    camera.lookAt(0, 2, 0);

    // 3. POST-PROCESSING (TSL Node Graph)
    postProcessing = new THREE.PostProcessing(renderer);
    
    // Create the base scene render node
    const scenePass = pass(scene, camera);
    
    // Apply Bloom (InputNode, Strength, Radius, Threshold)
    const bloomNode = bloom(scenePass, 1.5, 0.5, 0.1);
    
    // Set final output: Scene + Glow
    postProcessing.outputNode = scenePass.add(bloomNode);

    // 4. World Creation
    createGrid();
    createBuildings();

    // 5. Light
    const neonSun = new THREE.DirectionalLight(0x00ffff, 10);
    neonSun.position.set(5, 10, 5);
    scene.add(neonSun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createGrid() {
    const gridGeo = new THREE.PlaneGeometry(300, 300, 80, 80);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    gridMat.colorNode = Fn(() => {
        const pulse = tslTime.mul(2.0).sin().add(1.1).mul(0.2);
        return vec3(0.0, 0.5, 0.8).mul(pulse);
    })();
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createBuildings() {
    const count = 1000;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.0, 0.0, 0.05);
    material.emissiveNode = Fn(() => {
        const stripes = positionLocal.y.mul(10.0).fract().step(0.9);
        return vec3(0.0, 1.0, 1.0).mul(stripes).mul(tslTime.sin().add(1.2));
    })();
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 160;
        const z = (Math.random() - 0.5) * 300;
        if (Math.abs(x) < 12) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(1.5, Math.random() * 35 + 5, 1.5);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
}

function animate(timestamp) {
    camera.position.z -= 0.15;
    if (camera.position.z < -150) camera.position.z = 150;
    if (timestamp - lastSave > 5000) {
        PersistenceManager.save('last_pos', { z: camera.position.z });
        lastSave = timestamp;
    }
    postProcessing.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
