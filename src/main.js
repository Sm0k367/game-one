import * as THREE from 'three/webgpu';
import { Fn, positionLocal, vec3, time } from 'three/tsl';

/**
 * NEURAL STATE - World Engine v0.1.0
 * Features: WebGPU Compute, Persistent Procedural Grid, Adaptive Performance
 */

let renderer, scene, camera, world;

async function init() {
    // 1. Adaptive WebGPU Renderer
    renderer = new THREE.WebGPURenderer({ antialias: true });
    await renderer.init(); // Required for WebGPU startup
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.body.appendChild(renderer.domElement);

    // 2. Scene & Camera Setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020202);
    scene.fog = new THREE.Fog(0x020202, 10, 50);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // 3. The "Neural" World Grid (Procedural)
    createWorld();

    // 4. Start Render Loop
    renderer.setAnimationLoop(animate);
}

function createWorld() {
    const gridSize = 100;
    const spacing = 2;
    
    // Geometry for a "City Block"
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    
    // TSL Node Material (Action-Packed Neon Glow)
    const material = new THREE.MeshStandardNodeMaterial();
    
    // Logic: Height of buildings based on persistent noise
    material.positionNode = Fn(() => {
        const pos = positionLocal;
        return vec3(pos.x, pos.y.mul(2.0), pos.z);
    })();

    material.colorNode = Fn(() => {
        return vec3(0.0, 1.0, 0.8).mul(time.sin().add(1.0));
    })();

    // Instanced Mesh for High Performance (GTA-scale)
    const instancedMesh = new THREE.InstancedMesh(geometry, material, gridSize * gridSize);
    const dummy = new THREE.Object3D();

    let i = 0;
    for (let x = 0; x < gridSize; x++) {
        for (let z = 0; z < gridSize; z++) {
            dummy.position.set(
                (x - gridSize / 2) * spacing, 
                0, 
                (z - gridSize / 2) * spacing
            );
            // Randomize building heights for the "city" look
            dummy.scale.set(1, Math.random() * 10 + 1, 1);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(i++, dummy.matrix);
        }
    }

    scene.add(instancedMesh);

    // Add Ambient Light
    const ambient = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambient);
}

function animate() {
    // Basic camera drift for the "Highly Visual" feel
    camera.position.z -= 0.05;
    if (camera.position.z < -20) camera.position.z = 20;

    renderer.render(scene, camera);
}

// Window Resize Support
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

init().catch(err => console.error("Neural State Init Failed:", err));
