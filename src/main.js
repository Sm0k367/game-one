import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass, bloom, hash, floor, fract, mix } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // AgX prevents the "Cyan Soup" effect by handling high brightness correctly
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.0;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000103);
    scene.fog = new THREE.Fog(0x000103, 5, 130);

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 100);

    // POST-PROCESSING: THE "CINEMATIC" STACK
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Tight Bloom: Only the neon windows and engine will glow
    const bloomNode = bloom(scenePass, 1.5, 0.1, 0.9);
    postProcessing.outputNode = scenePass.add(bloomNode);

    createHorizonSun();
    createCyberGrid();
    createDetailedMegaCity();
    createHeroShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createDetailedMegaCity() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ color: 0x010102 });

    // TSL Shader: Sharp Grid Windows
    material.emissiveNode = Fn(() => {
        const p = positionLocal.xy.mul(vec3(10, 18, 1)); 
        const grid = fract(p).step(0.88); 
        const id = hash(floor(p));
        
        const flicker = tslTime.mul(id.mul(3)).sin().add(1.2);
        const neonCyan = vec3(0.0, 5.0, 10.0);
        const neonPink = vec3(10.0, 0.0, 5.0);
        
        const color = mix(neonCyan, neonPink, id.step(0.85));
        return color.mul(grid).mul(flicker).mul(0.5);
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, 1000);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 1000; i++) {
        const x = (Math.random() - 0.5) * 300;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 25) continue;
        
        dummy.position.set(x, 0, z);
        dummy.scale.set(6, Math.random() * 100 + 10, 6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createHorizonSun() {
    const sunGeo = new THREE.SphereGeometry(30, 64, 64);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(10, 10, 15); // Pure white-blue intensity
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, -10, -280); 
    scene.add(sun);
}

function createCyberGrid() {
    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 200, 200);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    gridMat.colorNode = vec3(0.0, 0.5, 2.0); 
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createHeroShip() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.4, 4),
        new THREE.MeshStandardNodeMaterial({ color: 0x050505 })
    );
    
    const engineMat = new THREE.MeshBasicNodeMaterial();
    engineMat.colorNode = vec3(15, 5, 0); // Bright Orange Thruster
    const thruster = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.5), engineMat);
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = 2.5;

    group.add(body, thruster);
    ship = group;
    scene.add(ship);
}

function animate() {
    camera.position.z -= 0.8; 
    if (camera.position.z < -400) camera.position.z = 400;

    if (ship) {
        const targetX = pointer.x * 35;
        const targetY = (pointer.y * 15) + 6;
        
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, targetX, 0.08);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, targetY, 0.08);
        ship.position.z = camera.position.z - 30;
        
        ship.rotation.z = (ship.position.x - targetX) * 0.1;
        ship.rotation.y = (ship.position.x - targetX) * 0.05;
    }

    postProcessing.render();
}

init();
