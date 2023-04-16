//Physics library: npm install --save cannon-es@0.15.1

//! check HingeConstraints to create connections 
//! between rigid bodies
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import * as dat from 'lil-gui'

//import * as CANNON from 'cannon-es'
import CANNON from 'cannon'

/**
 * Debug
 */
const gui = new dat.GUI()
const debugObject = {}

//add '' createSphere'' button to the debug gui
debugObject.createSphere = () => {
    createSphere(
        Math.random() * 0.7,
        {
            x:(Math.random() - 0.5) * 3,
            y:3,
            z:(Math.random() - 0.5) * 3
        })
}
gui.add(debugObject,'createSphere')

//add '' createBox'' button to the debug gui
debugObject.createBox = () => {
    createBox(
        Math.random() ,
        Math.random() ,
        Math.random() ,
        {
            x:(Math.random() - 0.5) * 3,
            y:3,
            z:(Math.random() - 0.5) * 3
        })
}
gui.add(debugObject,'createBox')

//button to reset the scene by removing the objects and 
// all event listeners, also empties the array
debugObject.reset = () => {
    for (const object of objectsToUpdate){
        object.body.removeEventListener('collide',playHitSound)
        world.removeBody(object.body)

        scene.remove(object.mesh)
    }
    objectsToUpdate.splice(0,objectsToUpdate.length)
}
gui.add(debugObject,'reset')

/**
 * Base
 */
// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Sounds
 */

const hitSound = new Audio('/sounds/hit.mp3')
const playHitSound  = (collision) => {
    const impactStrenght = collision.contact.getImpactVelocityAlongNormal()
    if (impactStrenght > 2) {
        hitSound.volume = impactStrenght / 10
        hitSound.currentTime = 0
        hitSound.play()
    }
}

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

//change the collision calculations to improve performance
world.broadphase = new CANNON.SAPBroadphase(world)

//allow sleep for objects that are mooving very slow
//will not be calculated . This will improve performance
world.allowSleep = true

//add gravity
world.gravity.set(0,-9.82,0)

gui.add(world.gravity,'y')
    .min(-20)
    .max(0)
    .step(0.01)
    .name('Gravity Force')

// Create PHYSICS material for rigid bodies
const concreteMaterial = new CANNON.Material('concrete')
const plasticMaterial = new CANNON.Material('plastic')

//create PHYSICS constact material between the two materials
const contactMaterial = new CANNON.ContactMaterial(
    concreteMaterial,
    plasticMaterial,
    {
        friction: 0.1,
        restitution: 0.5
    }
)
world.addContactMaterial(contactMaterial)

//create a collision body for a static floor (mass:0), 
//!dont forget to rotate it to match the MESH floor
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

/**Utils */
const objectsToUpdate = []
const sphereGeometry = new THREE.SphereGeometry(1,20,20)
const sphereMaterial = new THREE.MeshStandardMaterial({
    metalness: 0.3,
    roughness: 0.4,
    envMap:environmentMapTexture
})

const boxGeometry = new THREE.BoxGeometry(1,1,1)

//function to create a box MESH and PHYSICS body
const createBox = (width,height,depth,position) =>{
    // THREEjs Mesh
    const mesh = new THREE.Mesh(boxGeometry,sphereMaterial)
    mesh.scale.set(width,height,depth)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    //CANNON body
    const shape = new CANNON.Box(
        new CANNON.Vec3(width /2 ,height / 2,depth /2))
    const body = new CANNON.Body({
        mass:1,
        position: new CANNON.Vec3(position.x,position.y,position.z),
        shape:shape,
        material:plasticMaterial
    })
    body.position.copy(position)
    body.addEventListener('collide',playHitSound)
    world.addBody(body)
    //Save in objects array to update
    objectsToUpdate.push({
        mesh:mesh,
        body:body
    })
}

//function to create a sphere and rigidbody
const createSphere = (radius,position) =>{
    // THREEjs Mesh
    const mesh = new THREE.Mesh(sphereGeometry,sphereMaterial)
    mesh.scale.set(radius,radius,radius)
    mesh.castShadow = true
    mesh.position.copy(position)
    scene.add(mesh)

    //CANNON body
    const shape = new CANNON.Sphere(radius)
    const body = new CANNON.Body({
        mass:1,
        position: new CANNON.Vec3(position.x,position.y,position.z),
        shape:shape,
        material:plasticMaterial
    })
    body.addEventListener('collide',playHitSound)

    body.position.copy(position)
    world.addBody(body)

    //Save in objects array to update
    objectsToUpdate.push({
        mesh:mesh,
        body:body
    })
}

//createSphere(0.5,{x:0,y:2,z:0})
createBox(1.5,1,1,{x:0,y:2,z:0})

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
    
    //Update Physics World
    // 1/60 fps, deltaTime between ticks, 3- is the ticks that 3dworld can catch up with physics world
    world.step(1/60, deltaTime, 3)

    //Loop throught the objects array
    for (const object of objectsToUpdate)
    {   
        console.log(object.body.position)
        object.mesh.position.copy(object.body.position)
        object.mesh.quaternion.copy(object.body.quaternion)
    }

    //console.log(objectsToUpdate[0].body.position)

    // Update controls
    controls.update()

    // Render
    renderer.render(scene, camera)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()