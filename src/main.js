import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time as tslTime, pass, bloom, colorAdust, mix, uv, fract, floor, hash } from 'three/tsl';
import { PersistenceManager } from './persistence.js';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // AgX is the "Secret Sauce" for the cinematic look - it prevents the cyan blowout
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 1.2;
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000205);
    // Darker, tighter fog to create depth silhouettes
    scene.fog = new THREE.Fog(0x000205, 5, 120);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 6, 100);

    // 1. ADVANCED POST-PROCESSING
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Layered Bloom: Sharp threshold (0.95) means ONLY the hottest neon glows
    const bloomNode = bloom(scenePass, 1.2, 0.15, 0.95);
    postProcessing.outputNode = scenePass.add(bloomNode);

    // 2. THE WORLD
    createCinematicSun();
    createCyberGrid();
    createDetailedBuildings();
    createHeroShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    renderer.setAnimationLoop(() => animate());
}

function createDetailedBuildings() {
    // Instead of one box, we use varied heights and a complex TSL material
    const count = 800;
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshStandardNodeMaterial({ color: 0x010102 });

    // TSL Shader: Procedural Window Grid with Random Flicker
    material.emissiveNode = Fn(() => {
        const p = positionLocal.xy.mul(vec3(8, 15, 1)); // Window density
        const grid = fract(p).step(0.85); // Sharp window edges
        const id = hash(floor(p)); // Unique ID for every window
        
        const flicker = tslTime.mul(id.mul(2)).sin().add(1.5);
        const neonCyan = vec3(0.0, 4.0, 10.0);
        const neonPink = vec3(8.0, 0.0, 5.0);
        
        // Randomly mix Cyan and Pink windows like the target image
        const color = mix(neonCyan, neonPink, id.step(0.8));
        return color.mul(grid).mul(flicker).mul(0.6);
    })();

    const mesh = new THREE.InstancedMesh(geometry, material, count);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
        const x = (Math.random() - 0.5) * 250;
        const z = (Math.random() - 0.5) * 600;
        if (Math.abs(x) < 25) continue;
        
        dummy.position.set(x, 0, z);
        dummy.scale.set(6, Math.random() * 100 + 10, 6);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createCinematicSun() {
    const sunGeo = new THREE.SphereGeometry(30, 64, 64);
    const sunMat = new THREE.MeshBasicNodeMaterial();
    sunMat.colorNode = vec3(15, 15, 20); // Blinding white-blue
    const sun = new THREE.Mesh(sunGeo, sunMat);
    sun.position.set(0, -10, -280); // Lowered for that horizon look
    scene.add(sun);
}

function createCyberGrid() {
    const gridGeo = new THREE.PlaneGeometry(1000, 1000, 200, 200);
    const gridMat = new THREE.MeshBasicNodeMaterial({ wireframe: true });
    gridMat.colorNode = vec3(0.0, 0.3, 1.0).mul(2); 
    const grid = new THREE.Mesh(gridGeo, gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createHeroShip() {
    // A more complex ship "silhouette" using grouped geometry
    const group = new THREE.Group();
    
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(2, 0.4, 4),
        new THREE.MeshStandardNodeMaterial({ color: 0x050505 })
    );
    
    const wingMat = new THREE.MeshStandardNodeMaterial({ color: 0x050505 });
    wingMat.emissiveNode = vec3(0, 10, 15); // Glowing wing tips
    
    const leftWing = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 2), wingMat);
    leftWing.position.set(-2, 0, 0);
    leftWing.rotation.z = 0.2;
    
    const rightWing = leftWing.clone();
    rightWing.position.x = 2;
    rightWing.rotation.z = -0.2;

    const thruster = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.6, 1),
        new THREE.MeshBasicNodeMaterial({ color: new THREE.Color(20, 5, 0) })
    );
    thruster.rotation.x = Math.PI / 2;
    thruster.position.z = 2;

    group.add(body, leftWing, rightWing, thruster);
    ship = group;
    scene.add(ship);
}

function animate() {
    // 1. THE "JUICE": Camera FOV breathing based on movement
    camera.position.z -= 0.8;
    if (camera.position.z < -400) camera.position.z = 400;
    
    camera.fov = 75 + (Math.sin(tslTime.value) * 2); // Subtle speed-breathing
    camera.updateProjectionMatrix();

    if (ship) {
        const targetX = pointer.x * 30;
        const targetY = (pointer.y * 15) + 6;
        
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, targetX, 0.08);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, targetY, 0.08);
        ship.position.z = camera.position.z - 30;
        
        // Banking (Rotation)
        ship.rotation.z = (ship.position.x - targetX) * 0.1;
        ship.rotation.y = (ship.position.x - targetX) * 0.05;
    }

    postProcessing.render();
}

init();
