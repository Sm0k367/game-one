import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
// Use the explicit addon path for Bloom - this is the fix for Vercel builds
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing;
let lastSave = 0;

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010205);
    scene.fog = new THREE.Fog(0x010205, 15, 90);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 5, savedState ? savedState.z : 50);

    // POST-PROCESSING INITIALIZATION
    postProcessing = new THREE.PostProcessing(renderer);
    
    // 1. Create the scene pass
    const scenePass = pass(scene, camera);
    
    // 2. Create bloom effect (InputNode, Strength, Radius, Threshold)
    const bloomPass = bloom(scenePass, 1.5, 0.4, 0.1);
    
    // 3. Chain them: we output the scene PLUS the bloom glow
    postProcessing.outputNode = scenePass.add(bloomPass);

    createGrid();
    createBuildings();

    const neonLight = new THREE.DirectionalLight(0x00ffff, 10);
    neonLight.position.set(5, 10, 5);
    scene.add(neonLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createGrid() {
    const gridGeo = new THREE.PlaneGeometry(300, 300, 80, 80);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    gridMat.colorNode = Fn(() => {
        const pulse = tslTime.mul(2.0).sin().add(1.0).mul(0.2);
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
        const stripes = positionLocal.y.mul(12.0).fract().step(0.9);
        return vec3(0.0, 1.0, 1.0).mul(stripes).mul(tslTime.sin().add(1.1));
    })();
    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 150;
        const z = (Math.random() - 0.5) * 300;
        if (Math.abs(x) < 12) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(1.5, Math.random() * 30 + 5, 1.5);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
}

function animate(timestamp) {
    camera.position.z -= 0.12;
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
