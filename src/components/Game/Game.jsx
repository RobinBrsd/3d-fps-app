import React, { Component } from 'react';
import * as THREE from 'three';
// import * as CANNON from 'cannon';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls';
import charModel from './out.glb';
import weaponModel from './commando.glb';
import openSocket from 'socket.io-client';
import './Game.scss';

var backURL = 'http://localhost:7777/';
if (!window.location.href.includes('http://localhost:3000/')) {
    backURL = 'https://fps-3d-server.herokuapp.com';
}

const socket = openSocket(backURL);

class Game extends Component {
    state = {
        pname: this.props.location.state.pname,
        roomID: this.props.location.state.roomID.substring(
            0,
            this.props.location.state.roomID,
            -1
        ),
        vol: 0.05,
        socket: socket,
        player: {
            bulletSpeed: 550,
            speed: 470.0,
            collisionRadius: 12,
        },
        wall: { width: 50, height: 70 },
        map: [
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 1, 0, 1],
            [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
            [1, 0, 1, 1, 0, 0, 0, 0, 0, 1],
            [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
            [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
        ],
    };

    componentDidMount = () => {
        console.log(`Logged as ${this.state.pname}`);
        this.audio = new Audio(
            require('../Audio/playlist/bensound-newdawn.mp3')
        );
        this.audio.loop = true;
        this.audio.volume = this.state.vol - 0.03;
        this.audio.play();

        this.lifeBar = document.querySelector('#hp');
        this.playerHP = 198;
        this.j1Score = 0;
        this.j2Score = 0;
        this.j1ScoreBar = document.querySelector('#j1Score');
        this.j2ScoreBar = document.querySelector('#j2Score');
        this.j1Dead = false;
        this.j2Dead = false;
        this.loading = true;
        setTimeout(() => {
            this.loading = false;
            document.querySelector('#instructions').innerHTML =
                ' Game Ready <br/> Click !';
        }, 3000);

        this.spawn = [
            {
                pos: { x: 15, y: 50, z: -190 },
                rot: { y: 2.9 },
            },
            {
                pos: { x: -240, y: 50, z: -50 },
                rot: { y: -0.44 },
            },
            {
                pos: { x: 57, y: 50, z: -292 },
                rot: { y: 3.1 },
            },
            {
                pos: { x: 55, y: 50, z: -235 },
                rot: { y: 3.1 },
            },
            {
                pos: { x: 37, y: 50, z: 37 },
                rot: { y: 0.8 },
            },
            {
                pos: { x: -270, y: 50, z: -275 },
                rot: { y: -2.3 },
            },
            {
                pos: { x: -294, y: 50, z: 5 },
                rot: { y: -0.2 },
            },
            {
                pos: { x: -277, y: 50, z: 57 },
                rot: { y: -1.5 },
            },
            {
                pos: { x: -203, y: 50, z: 52 },
                rot: { y: -1.5 },
            },
        ];

        socket.emit('joinRoomGame', this.state.roomID, this.state.pname);
        this.container = document.querySelector('#root');
        this.mapSize = this.state.map[0].length * this.state.wall.width;
        this.fixObjects = [];

        this.hasHitRecently = false;
        this.moveFront = false;
        this.moveBack = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.jump = false;
        this.playerVelocity = new THREE.Vector3();

        this.setScene();
        this.loadCharModel();
        this.listenPlayerMove();
        this.animate();
        window.addEventListener('mousedown', this.shootBullet);
        window.addEventListener('resize', this.updateDimensions);
        socket.on('playerMoved', this.moveModel);
        socket.on('getBullet', this.displayBullet);
        socket.on('hited', this.checkHit);
        socket.on('playerDied', this.playerDie);
    };

    componentWillUnmount = () => {
        this.audio.pause();
        let canvas = document.querySelector('canvas');
        canvas.parentNode.removeChild(canvas);
        window.removeEventListener('resize', this.updateDimensions);
    };

    setScene = () => {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0xcccccc, 0.0015);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setClearColor(this.scene.fog.color);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.container.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            1,
            2000
        );

        this.camera.rotation.order = 'YXZ';
        if (this.state.pname === 'J1') {
            this.camera.position.set(
                this.spawn[0].pos.x,
                this.spawn[0].pos.y,
                this.spawn[0].pos.z
            );

            this.camera.rotation.y = this.spawn[0].rot.y;
        } else {
            this.camera.position.set(
                this.spawn[1].pos.x,
                this.spawn[1].pos.y,
                this.spawn[1].pos.z
            );
            this.camera.rotation.y = this.spawn[1].rot.y;
        }
        this.scene.add(this.camera);

        this.emitter = new THREE.Object3D();
        this.emitter.position.set(4, -6, -30);
        this.camera.add(this.emitter);
        this.bullets = [];

        this.clock = new THREE.Clock();
        this.loader = new GLTFLoader();

        this.generateMap();
        this.generateLight();

        this.controls = new PointerLockControls(this.camera, this.container);
        this.scene.add(this.controls.getObject());
        this.getPointerLock();
    };

    shootBullet = (e) => {
        if (e.which === 3) {
            return;
        }
        var audio = new Audio(require('../Audio/gun-shot.mp3'));
        audio.volume = this.state.vol;
        audio.play();
        let posEmit = this.emitter.getWorldPosition(new THREE.Vector3());
        let posCam = this.camera.quaternion;
        socket.emit('shoot', this.state.roomID, { posEmit, posCam });
    };

    displayBullet = (bulletPos) => {
        let bullet = new THREE.Mesh(
            new THREE.SphereGeometry(0.2, 10, 10),
            new THREE.MeshBasicMaterial({ color: 'white' })
        );

        bullet.position.copy(bulletPos.posEmit);
        bullet.quaternion._w = bulletPos.posCam._w;
        bullet.quaternion._x = bulletPos.posCam._x;
        bullet.quaternion._y = bulletPos.posCam._y;
        bullet.quaternion._z = bulletPos.posCam._z;

        this.scene.add(bullet);
        this.bullets.push({ bullet, alive: 0 });
    };

    playerDie = (playerDead) => {
        var audio = new Audio(require('../Audio/death.wav'));
        audio.volume = this.state.vol;
        audio.play();
        if (playerDead === 'J2') {
            this.j2Dead = true;
            this.j1Score = this.j1Score + 1;
            this.j1ScoreBar.innerHTML = this.j1Score;
            setTimeout(() => {
                this.j2Dead = false;
            }, 1100);
        } else {
            this.j1Dead = true;
            this.j2Score = this.j2Score + 1;
            this.j2ScoreBar.innerHTML = this.j2Score;
            setTimeout(() => {
                this.j1Dead = false;
            }, 1100);
        }

        if (this.state.pname === 'J1' && playerDead === 'J2') {
            // si je suis J1 et je kill j2
            this.char2.scene.rotation.x = 7.65;
            setTimeout(() => {
                this.char2.scene.rotation.x = 0;
            }, 1000);
        }

        if (this.state.pname === 'J2' && playerDead === 'J1') {
            // si je suis j2 et je kill j1
            this.char1.scene.rotation.x = 7.65;
            setTimeout(() => {
                this.char1.scene.rotation.x = 0;
            }, 1000);
        }

        if (this.state.pname === 'J1' && playerDead === 'J1') {
            // si je suis mort et que je suis j1
            this.dead = true;
            let index = Math.floor(Math.random() * 9);
            setTimeout(() => {
                this.dead = false;
                this.playerHP = 198;
                this.lifeBar.style.width = this.playerHP + 'px';
                this.camera.position.set(
                    this.spawn[index].pos.x,
                    this.spawn[index].pos.y,
                    this.spawn[index].pos.z
                );
                this.camera.rotation.y = this.spawn[index].rot.y;
            }, 1150);
        }

        if (this.state.pname === 'J2' && playerDead === 'J2') {
            // si je suis mort et que je suis j2
            this.dead = true;
            let index = Math.floor(Math.random() * 9);
            setTimeout(() => {
                this.dead = false;
                this.playerHP = 198;
                this.lifeBar.style.width = this.playerHP + 'px';
                this.camera.position.set(
                    this.spawn[index].pos.x,
                    this.spawn[index].pos.y,
                    this.spawn[index].pos.z
                );
                this.camera.rotation.y = this.spawn[index].rot.y;
            }, 1150);
        }
    };

    checkHit = (player) => {
        if (player === 'J1' && this.state.pname === 'J2' && !this.j2Dead) {
            this.playerHP = this.playerHP - 35;
        }

        if (player === 'J2' && this.state.pname === 'J1' && !this.j1Dead) {
            this.playerHP = this.playerHP - 35;
        }
        this.lifeBar.style.width = this.playerHP + 'px';

        if (this.state.pname === 'J1' && this.playerHP < 0 && !this.j1Dead) {
            socket.emit('playerDie', this.state.roomID, this.state.pname);
        }

        if (this.state.pname === 'J2' && this.playerHP < 0 && !this.j2Dead) {
            socket.emit('playerDie', this.state.roomID, this.state.pname);
        }
    };

    detectCollision = () => {
        let rotMatrix;

        let camDir = this.controls.getDirection(
            new THREE.Vector3(0, 0, 0).clone()
        );

        let rayCaster = new THREE.Raycaster(
            this.controls.getObject().position,
            camDir
        );

        if (this.moveBack) {
            rotMatrix = new THREE.Matrix4();
            rotMatrix.makeRotationY((180 * Math.PI) / 180);
        } else if (this.moveLeft) {
            rotMatrix = new THREE.Matrix4();
            rotMatrix.makeRotationY((90 * Math.PI) / 180);
        } else if (this.moveRight) {
            rotMatrix = new THREE.Matrix4();
            rotMatrix.makeRotationY((270 * Math.PI) / 180);
        }

        if (rotMatrix !== undefined) {
            camDir.applyMatrix4(rotMatrix);
        }

        let intersects = rayCaster.intersectObjects(this.fixObjects, true);
        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].distance < this.state.player.collisionRadius) {
                return true;
            }
        }
        return false;
    };

    generateMap = () => {
        var loader = new THREE.TextureLoader();
        var wallTexture = loader.load(require('./neon1.jpeg'));
        var wallMaterial = new THREE.MeshBasicMaterial({
            map: wallTexture,
            side: THREE.DoubleSide,
        });
        let wallGeometry = new THREE.BoxGeometry(
            this.state.wall.width,
            this.state.wall.height,
            this.state.wall.width
        );

        let widthOffset = this.state.wall.width / 10;
        let heightOffset = this.state.wall.height / 10;

        for (let i = 0; i < this.state.map[0].length; i++) {
            for (let j = 0; j < this.state.map[i].length; j++) {
                if (this.state.map[i][j]) {
                    let wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
                    wallMesh.position.set(
                        (j - heightOffset) * this.state.wall.width +
                            widthOffset,
                        heightOffset,
                        (i - heightOffset) * this.state.wall.width + widthOffset
                    );
                    this.scene.add(wallMesh);
                    this.fixObjects.push(wallMesh);
                }
            }
        }
        var floorTexture = loader.load(require('./neon1.jpeg'));
        floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
        floorTexture.repeat.set(10, 10);
        var floorMaterial = new THREE.MeshBasicMaterial({
            map: floorTexture,
            side: THREE.DoubleSide,
        });
        var floorGeometry = new THREE.PlaneGeometry(
            this.mapSize * 1.3,
            this.mapSize * 1.3
        );
        var floor = new THREE.Mesh(floorGeometry, floorMaterial);
        floor.rotateX((90 * Math.PI) / 180);
        this.scene.add(floor);

        // skybox
        let urls = [
            require('./ulukai/corona_ft.png'),
            require('./ulukai/corona_bk.png'),
            require('./ulukai/corona_up.png'),
            require('./ulukai/corona_dn.png'),
            require('./ulukai/corona_rt.png'),
            require('./ulukai/corona_lf.png'),
        ];
        let loaderBox = new THREE.CubeTextureLoader();
        this.scene.background = loaderBox.load(urls);
    };

    generateLight = () => {
        var light = new THREE.DirectionalLight(0xcccccc, 1, 10);
        light.position.set(1, 0, -1);
        this.scene.add(light);

        let light1 = new THREE.DirectionalLight(0xcccccc, 1, 10);
        light1.position.set(1, 1, 1);
        this.scene.add(light1);

        let light2 = new THREE.DirectionalLight(0xcccccc, 1, 10);
        light2.position.set(-1, -1, 1);
        this.scene.add(light2);
    };

    loadCharModel = () => {
        if (!this.char1 && this.state.pname === 'J2') {
            this.loader.load(charModel, (gltf) => {
                this.char1 = gltf;
                this.mixer = new THREE.AnimationMixer(this.char1.scene);
                let action = this.mixer.clipAction(this.char1.animations[0]);
                action.play();
                this.char1.scene.scale.set(0.1, 0.1, 0.1);
                this.scene.add(this.char1.scene);
            });

            this.loader.load(weaponModel, (gltf) => {
                this.weapon2 = gltf.scene;
                this.weapon2.scale.set(0.07, 0.07, 0.07);
                this.weapon2.castShadow = true;
                this.weapon2.receiveShadow = true;
                this.camera.add(this.weapon2);
                this.weapon2.position.set(4, -7, -30);
            });
        }

        if (!this.char2 && this.state.pname === 'J1') {
            this.loader.load(charModel, (gltf) => {
                this.char2 = gltf;
                this.mixer2 = new THREE.AnimationMixer(this.char2.scene);
                let action = this.mixer2.clipAction(this.char2.animations[0]);
                action.play();
                this.char2.scene.scale.set(0.1, 0.1, 0.1);
                this.scene.add(this.char2.scene);
            });

            this.loader.load(weaponModel, (gltf) => {
                this.weapon1 = gltf.scene;
                this.weapon1.scale.set(0.07, 0.07, 0.07);
                this.weapon1.castShadow = true;
                this.weapon1.receiveShadow = true;
                this.camera.add(this.weapon1);
                this.weapon1.position.set(4, -7, -30);
            });
        }
    };

    getPointerLock = () => {
        document.onclick = () => {
            this.container.requestPointerLock();
        };
        document.addEventListener('pointerlockchange', this.lockChange, false);
    };

    lockChange = () => {
        if (document.pointerLockElement === this.container) {
            document.querySelector('#blocker').style.display = 'none';
            document.querySelector('#menu').style.display = 'none';
            this.controls.enabled = true;
        } else {
            document.querySelector('#blocker').style.display = '';
            document.querySelector('#menu').style.display = '';
            this.controls.enabled = false;
        }
    };

    updateDimensions = () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    playWalkSound = () => {
        if (!this.isPlayingSound) {
            let audio = new Audio(require('../Audio/walk.wav'));
            audio.volume = this.state.vol - 0.038;
            audio.play();
            this.isPlayingSound = true;
            setTimeout(() => {
                this.isPlayingSound = false;
            }, 300);
        }
    };

    listenPlayerMove = () => {
        let keyDown = (e) => {
            if (this.dead) return;
            switch (e.keyCode) {
                case 38:
                case 87:
                case 90:
                    this.playWalkSound();
                    this.moveFront = true;
                    break;
                case 37:
                case 65:
                case 81:
                    this.playWalkSound();
                    this.moveLeft = true;
                    break;
                case 40:
                case 83:
                    this.playWalkSound();
                    this.moveBack = true;
                    break;
                case 39:
                case 68:
                    this.playWalkSound();
                    this.moveRight = true;
                    break;
                case 32:
                    if (this.jump) {
                        var audio = new Audio(require('../Audio/jump.wav'));
                        audio.volume = this.state.vol;
                        audio.play();
                        this.playerVelocity.y += 200;
                    }
                    this.jump = false;
                    break;
                default:
                    break;
            }
        };

        let keyUp = (e) => {
            switch (e.keyCode) {
                case 38:
                case 87:
                case 90:
                    this.moveFront = false;
                    break;
                case 37:
                case 65:
                case 81:
                    this.moveLeft = false;
                    break;
                case 40:
                case 83:
                    this.moveBack = false;
                    break;
                case 39:
                case 68:
                    this.moveRight = false;
                    break;
                default:
                    break;
            }
        };

        document.addEventListener('keydown', keyDown, false);
        document.addEventListener('keyup', keyUp, false);
    };

    animatePlayer = (delta) => {
        this.playerVelocity.x -= this.playerVelocity.x * 10.0 * delta;
        this.playerVelocity.z -= this.playerVelocity.z * 10.0 * delta;
        this.playerVelocity.y -= 16 * 100.0 * delta;

        let inContact = this.detectCollision();
        if (!inContact) {
            if (this.moveFront) {
                this.playerVelocity.z += this.state.player.speed * delta;
            }
            if (this.moveBack) {
                this.playerVelocity.z -= this.state.player.speed * delta;
            }
            if (this.moveLeft) {
                this.playerVelocity.x -= this.state.player.speed * delta;
            }
            if (this.moveRight) {
                this.playerVelocity.x += this.state.player.speed * delta;
            }
            if (this.jump) {
                this.playerVelocity.y += this.state.player.speed * delta;
            }

            this.controls.getObject().position.y +=
                this.playerVelocity.y * delta;

            if (
                this.moveFront ||
                this.moveBack ||
                this.moveLeft ||
                this.moveRight ||
                this.jump
            ) {
                this.controls.moveForward(this.playerVelocity.z * delta);
                this.controls.moveRight(this.playerVelocity.x * delta);

                var pos = this.controls.getObject();

                let options = {
                    camPosX: pos.position.x,
                    camPosY: pos.position.y,
                    camPosZ: pos.position.z,
                    camRotY: pos.rotation.y,
                    delta: delta,
                };

                socket.emit(
                    'playerMove',
                    this.state.roomID,
                    this.state.pname,
                    options
                );

                this.prevBullet = this.bullet;
                this.lastY = this.playerVelocity.y;
                this.lastRotation = this.camera.rotation.y;
            }
        }
        if (
            !(
                this.moveFront ||
                this.moveBack ||
                this.moveLeft ||
                this.moveRight
            ) ||
            inContact
        ) {
            this.playerVelocity.x = 0;
            this.playerVelocity.z = 0;
        }

        if (this.controls.getObject().position.y < 16) {
            this.playerVelocity.y = 0;
            this.controls.getObject().position.y = 16;
            this.jump = true;
        }
    };

    moveModel = (player, options) => {
        if (player === 'J1' && this.state.pname === 'J2') {
            if (options.camPosY > 16) {
                this.char1.scene.position.set(
                    options.camPosX,
                    options.camPosY - 16,
                    options.camPosZ
                );
            } else {
                this.char1.scene.position.set(
                    options.camPosX,
                    0,
                    options.camPosZ
                );
            }
            this.char1.scene.rotation.y = options.camRotY - Math.PI;
        }
        if (player === 'J2' && this.state.pname === 'J1') {
            if (options.camPosY > 16) {
                this.char2.scene.position.set(
                    options.camPosX,
                    options.camPosY - 16,
                    options.camPosZ
                );
            } else {
                this.char2.scene.position.set(
                    options.camPosX,
                    0,
                    options.camPosZ
                );
            }
            this.char2.scene.rotation.y = options.camRotY - Math.PI;
        }
    };

    animate = () => {
        requestAnimationFrame(this.animate);

        if (!this.loading) {
            var delta = this.clock.getDelta();
            if (this.mixer) this.mixer.update(delta);
            if (this.mixer2) this.mixer2.update(delta);

            if ((this.char2 && this.weapon1) || (this.char1 && this.weapon2))
                this.animatePlayer(delta);

            this.bullets.forEach((bullet, i) => {
                if (bullet) {
                    bullet.alive = bullet.alive + 1;

                    if (bullet.alive > 50) {
                        bullet.bullet.geometry.dispose();
                        bullet.bullet.material.dispose();
                        this.scene.remove(bullet.bullet);
                        this.bullets.splice(i, 1);
                    }

                    bullet.bullet.translateZ(
                        -this.state.player.bulletSpeed * delta
                    );
                    let bulletHitbox = new THREE.Box3().setFromObject(
                        bullet.bullet
                    );

                    // Bullet hit wall idea 1
                    // for (let i = 0; i < this.fixObjects.length; i++) {
                    //     let wallHitBox = new THREE.Box3().setFromObject(
                    //         this.fixObjects[i]
                    //     );

                    //     let hasHitWall = bulletHitbox.intersectsBox(wallHitBox);

                    //     if (hasHitWall) {
                    //         bullet.geometry.dispose();
                    //         bullet.material.dispose();
                    //         this.scene.remove(bullet);
                    //         this.bullets.splice(i, 1);
                    //         return;
                    //     }
                    // }

                    let enemyHitbox = new THREE.Box3().setFromObject(
                        this.state.pname === 'J1'
                            ? this.char2.scene
                            : this.char1.scene
                    );

                    let hasHit = bulletHitbox.intersectsBox(enemyHitbox);
                    if (hasHit && !this.hasHitRecently) {
                        bullet.bullet.geometry.dispose();
                        bullet.bullet.material.dispose();
                        this.scene.remove(bullet.bullet);
                        this.bullets.splice(i, 1);
                        this.hasHitRecently = true;
                        socket.emit('hit', this.state.roomID, this.state.pname);
                        setTimeout(() => {
                            this.hasHitRecently = false;
                        }, 80);
                        return false;
                    }

                    // Bullet hit wall idea 2
                    // let bulletRay = new THREE.Raycaster(
                    //     bullet.position,
                    //     new THREE.Vector3(
                    //         bullet.quaternion._x,
                    //         bullet.quaternion._y,
                    //         -this.state.player.bulletSpeed * delta
                    //     )
                    // );

                    // let intersects = bulletRay.intersectObjects(
                    //     this.fixObjects,
                    //     true
                    // );
                    // for (let i = 0; i < intersects.length; i++) {
                    //     if (intersects[i].distance <= 10) {
                    //         console.log('hit');
                    //         bullet.geometry.dispose();
                    //         bullet.material.dispose();
                    //         this.scene.remove(bullet);
                    //         this.bullets.splice(i, 1);
                    //         return true;
                    //     }
                    // }
                }
            });

            this.renderer.render(this.scene, this.camera);
        }
    };

    render() {
        return (
            <section>
                <div id="score">
                    <p id="j1Score"> 0 </p>
                    <p id="j2Score"> 0 </p>
                </div>
                <div id="life">
                    <div id="hp"></div>
                </div>
                <div id="crosshair"></div>
                <div id="menu">
                    <a href={`/selection/${this.props.location.state.roomID}`}>
                        Back to selections
                    </a>
                    <p>commandes</p>
                </div>
                <div id="blocker">
                    <div id="instructions">
                        <strong> Loading... </strong>
                    </div>
                </div>
            </section>
        );
    }
}

export default Game;
