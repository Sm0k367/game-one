import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass, bloom } from 'three/tsl';
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
    scene.background = new THREE.Color(0x010205); 
    scene.fog = new THREE.Fog(0x010205, 20, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 4, savedState ? savedState.z : 50);

    // 3. CORRECT POST-PROCESSING (r171 Standard)
    postProcessing = new THREE.PostProcessing(renderer);
    
    // Create the scene texture node
    const scenePass = pass(scene, camera);
    
    // Chain the bloom effect node to the scene pass
    // Parameters: input, strength, radius, threshold
    const bloomNode = bloom(scenePass, 1.5, 0.5, 0.1); 
    
    // Set the final chain to the output
    postProcessing.outputNode = bloomNode;

    // 4. World Geometry
    createGrid();
    createBuildings();

    // 5. Lighting
    const neonSun = new THREE.DirectionalLight(0x00ffff, 8);
    neonSun.position.set(0, 10, -50);
    scene.add(neonSun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.1));

    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function createGrid() {
    const gridGeo = new THREE.PlaneGeometry(300, 300, 60, 60);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    
    gridMat.colorNode = Fn(() => {
        const zPos = positionLocal.z.add(tslTime.mul(4.0)).fract();
        return vec3(0.0, 0.3, 0.6).mul(zPos);
    })();

    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createBuildings() {
    const count = 1200;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.01, 0.01, 0.03); 
    
    material.emissiveNode = Fn(() => {
        const stripes = positionLocal.y.mul(8.0).fract().step(0.85);
        const flicker = tslTime.sin().add(1.5).mul(0.5);
        return vec3(0.0, 1.0, 0.9).mul(stripes).mul(flicker);
    })();

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 120;
        const z = (Math.random() - 0.5) * 200;
        if (Math.abs(x) < 10) continue; 

        dummy.position.set(x, 0, z);
        dummy.scale.set(2, Math.random() * 25 + 2, 2);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
}

function animate(timestamp) {
    camera.position.z -= 0.15;
    if (camera.position.z < -100) camera.position.z = 100;

    if (timestamp - lastSave > 5000) {
        PersistenceManager.save('last_pos', { z: camera.position.z });
        lastSave = timestamp;
    }

    // Crucial: Use postProcessing.render() instead of renderer.render()
    postProcessing.render();
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
