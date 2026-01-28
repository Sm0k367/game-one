import * as THREE from 'three/webgpu';
import { pass, bloom, tslFn, uv, vec2, vec3, vec4, fract, time, mix, step, hash, floor, positionLocal, saturation, brightness } from 'three/tsl';

let renderer, scene, camera, postProcessing, ship;
const pointer = new THREE.Vector2();

async function init() {
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // AGX + Low Exposure = The "Dark Cinematic" look.
    renderer.toneMapping = THREE.AgXToneMapping;
    renderer.toneMappingExposure = 0.5; 
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000); 
    scene.fog = new THREE.Fog(0x000000, 10, 120);

    camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
    camera.position.set(0, 5, 30);

    // POST-PROCESSING: THE "NEURAL" STACK
    postProcessing = new THREE.PostProcessing(renderer);
    const scenePass = pass(scene, camera);
    
    // Threshold 1.0 means ONLY things we make "Ultra Bright" will glow.
    const bloomNode = bloom(scenePass, 1.8, 0.5, 1.0); 
    
    // Boost saturation for that deep Cyan/Pink neon
    const effectNode = saturation(scenePass.add(bloomNode), 1.5);
    postProcessing.outputNode = effectNode;

    createGrid();
    createBuildings();
    createSun();
    createShip();

    window.addEventListener('pointermove', (e) => {
        pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    });

    animate();
}

function createGrid() {
    const gridMat = new THREE.MeshBasicNodeMaterial();
    gridMat.colorNode = tslFn(() => {
        const coords = uv().mul(100).add(vec2(0, time.mul(-2)));
        const lines = step(0.98, fract(coords.x)).add(step(0.98, fract(coords.y)));
        return vec4(vec3(0.0, 0.5, 1.0).mul(lines).mul(10.0), 1.0); // HDR Blue
    })();
    const grid = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), gridMat);
    grid.rotation.x = -Math.PI / 2;
    scene.add(grid);
}

function createBuildings() {
    const buildMat = new THREE.MeshStandardNodeMaterial({ color: 0x000000, roughness: 0 });
    buildMat.emissiveNode = tslFn(() => {
        const p = positionLocal.xy.mul(vec2(6, 12));
        const windows = step(0.9, fract(p));
        const id = hash(floor(p));
        const neon = mix(vec3(0, 10, 15), vec3(15, 0, 10), id.step(0.8));
        return neon.mul(windows).mul(hash(tslTime).add(0.5)); // Flickering windows
    })();

    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), buildMat, 800);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 800; i++) {
        const x = (Math.random() - 0.5) * 200;
        const z = (Math.random() - 0.5) * 500;
        if (Math.abs(x) < 18) continue;
        dummy.position.set(x, 0, z);
        dummy.scale.set(8, Math.random() * 100 + 5, 8);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
    }
    scene.add(mesh);
}

function createSun() {
    const sun = new THREE.Mesh(
        new THREE.SphereGeometry(30, 32, 32),
        new THREE.MeshBasicNodeMaterial()
    );
    sun.material.colorNode = vec3(10, 10, 15); // Pure white core
    sun.position.set(0, -10, -250);
    scene.add(sun);
}

function createShip() {
    ship = new THREE.Mesh(
        new THREE.ConeGeometry(0.5, 2, 4),
        new THREE.MeshStandardNodeMaterial({ color: 0x050505 })
    );
    ship.material.emissiveNode = vec3(20, 5, 0); // Orange engine
    ship.rotation.x = Math.PI / 2;
    scene.add(ship);
}

function animate() {
    requestAnimationFrame(animate);
    if (ship) {
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pointer.x * 25, 0.1);
        ship.position.y = THREE.MathUtils.lerp(ship.position.y, (pointer.y * 12) + 5, 0.1);
        ship.rotation.z = (ship.position.x - (pointer.x * 25)) * 0.2;
    }
    postProcessing.render();
}

init();
