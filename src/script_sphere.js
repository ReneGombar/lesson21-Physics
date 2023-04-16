//Physics library: npm install --save cannon

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'
import CANNON, { Material } from 'cannon'

/**
 * Debug
 */
const gui = new dat.GUI()

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Textures
 */
const textureLoader = new THREE.TextureLoader()
const cubeTextureLoader = new THREE.CubeTextureLoader()

const environmentMapTexture = cubeTextureLoader.load([
    '/textures/environmentMaps/0/px.png',
    '/textures/environmentMaps/0/nx.png',
    '/textures/environmentMaps/0/py.png',
    '/textures/environmentMaps/0/ny.png',
    '/textures/environmentMaps/0/pz.png',
    '/textures/environmentMaps/0/nz.png'
])

/**Physics World */
const world = new CANNON.World()

//add gravity
world.gravity.set(0,-9.82,0)

//gui.add('gravity',world.gravity.y).min(0).max(20).step(0.01)

/**Create material for rigid body for sphere and plane*/
const concreteMaterial = new CANNON.Material('concrete')
const plasticMaterial = new CANNON.Material('plastic')

//create constact material between the two material
const contactMaterial = new CANNON.ContactMaterial(
    concreteMaterial,
    plasticMaterial,
    {
        friction: 0.1,
        restitution: 0.8
    }
)
world.addContactMaterial(contactMaterial)

//create a collision shape for the sphere
const sphereShape = new CANNON.Sphere(0.5)

const sphereBody = new CANNON.Body({
    mass: 1,
    position : new CANNON.Vec3(0,3,0),
    shape: sphereShape,
    material: plasticMaterial
})
//this aplies a constant force in x direction
sphereBody.applyLocalForce(
    new CANNON.Vec3(150,0,0),
    new CANNON.Vec3(0,0,0)
)
world.addBody(sphereBody)

//create a collision body for a static floor (mass:0), dont forget to rotate it like the 3d floor
const floorShape = new CANNON.Plane()
const floorBody = new CANNON.Body({
    mass: 0,
    shape: floorShape,
    material: concreteMaterial
})
// to rotate in Cannon we use querternion
floorBody.quaternion.setFromAxisAngle(
    new CANNON.Vec3(1,0,0),
    - Math.PI *0.5
)
world.addBody(floorBody)

/**
 * Test sphere
*/
const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 10, 5),
    new THREE.MeshStandardMaterial({
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5,
        wireframe:true
        
    })
    )
    sphere.castShadow = true
    sphere.position.y = 0.5
    scene.add(sphere)
    
    /**
     * Floor
    */
const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(10, 10),
    new THREE.MeshStandardMaterial({
        color: '#777777',
        metalness: 0.3,
        roughness: 0.4,
        envMap: environmentMapTexture,
        envMapIntensity: 0.5
    })
    )
floor.receiveShadow = true
floor.rotation.x = - Math.PI * 0.5
scene.add(floor)

/**
* Lights
 */
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7)
scene.add(ambientLight)

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.2)
directionalLight.castShadow = true
directionalLight.shadow.mapSize.set(1024, 1024)
directionalLight.shadow.camera.far = 15
directionalLight.shadow.camera.left = - 7
directionalLight.shadow.camera.top = 7
directionalLight.shadow.camera.right = 7
directionalLight.shadow.camera.bottom = - 7
directionalLight.position.set(5, 5, 5)
scene.add(directionalLight)

/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}

window.addEventListener('resize', () =>
{
    // Update sizes
    sizes.width = window.innerWidth
    sizes.height = window.innerHeight

    // Update camera
    camera.aspect = sizes.width / sizes.height
    camera.updateProjectionMatrix()

    // Update renderer
    renderer.setSize(sizes.width, sizes.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
})

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 100)
camera.position.set(- 3, 3, 3)
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
renderer.setSize(sizes.width, sizes.height)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

/**
 * Animate
 */
const clock = new THREE.Clock()
let oldElapsedTime

const tick = () =>
{
    const elapsedTime = clock.getElapsedTime()
    const deltaTime = elapsedTime - oldElapsedTime
    oldElapsedTime = elapsedTime

    //adding wind force per each frame
    sphereBody.applyForce(new CANNON.Vec3(-0.5,0,0),sphereBody.position)

    //Update Physics World
    // 1/60 fps, deltaTime between ticks, 3- is the ticks that 3dworld can catch up with physics world
    world.step(1/60, deltaTime, 3)

    //Update the 3d World from physics world
    sphere.position.copy(sphereBody.position)
    sphere.quaternion.copy(sphereBody.quaternion)
    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()