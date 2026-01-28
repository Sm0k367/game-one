import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing;
let lastSave = 0;

// Player & Input State
let ship;
const pointer = new THREE.Vector2();
const targetPos = new THREE.Vector3(0, 3, 0);

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010205);
    scene.fog = new THREE.Fog(0x010205, 15, 100);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const savedState = PersistenceManager.load('last_pos');
    camera.position.set(0, 6, savedState ? savedState.z : 50);

    // 1. Setup Post-Processing
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    const bloomNode = bloom(scenePass, 1.8, 0.5, 0.1); 
    postProcessing.outputNode = scenePass.add(bloomNode);

    // 2. Build World
    createGrid();
    createBuildings();
    createShip();

    // 3. Lights
    const neonSun = new THREE.DirectionalLight(0x00ffff, 15);
    neonSun.position.set(0, 10, -50);
    scene.add(neonSun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.2));

    // 4. Input Listeners (Mouse & Touch)
    window.addEventListener('pointermove', onPointerMove);

    renderer.setAnimationLoop((timestamp) => animate(timestamp));
}

function onPointerMove(event) {
    // Convert screen pixel to -1 to +1 range
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function createShip() {
    // Create a sleek "Dart" ship
    const geometry = new THREE.ConeGeometry(0.5, 2, 4);
    geometry.rotateX(Math.PI / 2); // Point it forward
    
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0.1, 0.1, 0.1);
    
    // Add glowing engine trail effect
    material.emissiveNode = Fn(() => {
        return vec3(1.0, 0.4, 0.0).mul(tslTime.mul(10).sin().add(2));
    })();

    ship = new THREE.Mesh(geometry, material);
    scene.add(ship);
}

function createGrid() {
    const gridGeo = new THREE.PlaneGeometry(400, 400, 100, 100);
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.wireframe = true;
    gridMat.colorNode = Fn(() => {
        const pulse = tslTime.mul(1.5).sin().add(1.1).mul(0.15);
        return vec3(0.0, 0.6, 1.0).mul(pulse);
    })();
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createBuildings() {
    const count = 1200;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial();
    material.colorNode = vec3(0, 0, 0.02);
    material.emissiveNode = Fn(() => {
        const stripes = positionLocal.y.mul(15.0).fract().step(0.92);
        return vec3(0.0, 0.8, 1.0).mul(stripes).mul(tslTime.sin().add(1.2));
    })();

    const instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 180;
        const z = (Math.random() - 0.5) * 400;
        if (Math.abs(x) < 15) continue; // Lane for the ship

        dummy.position.set(x, 0, z);
        dummy.scale.set(2, Math.random() * 40 + 5, 2);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(instancedMesh);
}

function animate(timestamp) {
    // 1. Movement Logic
    camera.position.z -= 0.2;
    if (camera.position.z < -200) camera.position.z = 200;

    // 2. Ship Follow Logic with Easing (Lerp)
    if (ship) {
        // Target x/y based on pointer, keeping z in front of camera
        targetPos.x = pointer.x * 15;
        targetPos.y = (pointer.y * 5) + 3;
        targetPos.z = camera.position.z - 15;

        ship.position.lerp(targetPos, 0.1);
        
        // Tilt the ship as it moves
        ship.rotation.z = (ship.position.x - targetPos.x) * 0.2;
        ship.rotation.y = (ship.position.x - targetPos.x) * 0.1;
    }

    // 3. Save Position
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
