import React, { Component } from 'react';
import { Redirect } from 'react-router-dom';
import './Selection.scss';
import shortid from 'shortid';
import openSocket from 'socket.io-client';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

import model from './out.glb';
import Chat from '../Chat/Chat';

var backURL = 'http://localhost:7777/';
if (!window.location.href.includes('http://localhost:3000/')) {
    backURL = 'https://fps-3d-server.herokuapp.com';
}

const socket = openSocket(backURL);

class Selection extends Component {
    state = {
        roomID: '',
        room: false,
        pname: '',
        pcount: 0,
    };

    componentDidMount = () => {
        this.checkUrl();

        socket.on('errorFull', (msg) => {
            setTimeout(() => {
                window.location.pathname = `/selection/${shortid.generate()}`;
            }, 500);
            return;
        });
    };

    componentDidUpdate = () => {
        if (this.state.room && !this.state.pname) {
            socket.emit('joinRoom', this.state.roomID);
            socket.on('joinedRoom', this.getPseudo);
            socket.on('readyPlayer', this.setBtnRdy);
            this.setScene();
            this.animate();
            window.addEventListener('resize', this.updateDimensions);
        } else if (this.state.room && this.state.pname) {
            this.setModel();
        }
        if (!this.state.room) this.checkUrl();
    };

    componentWillUnmount = () => {
        let canvas = document.querySelector('canvas');
        canvas.parentNode.removeChild(canvas);
        window.removeEventListener('resize', this.updateDimensions);
    };

    getPseudo = (pnumber) => {
        if (this.state.pname === '') {
            if (pnumber === 'J2') {
                this.setState({
                    pcount: this.state.pcount + 2,
                    pname: pnumber,
                });
            } else {
                this.setState({
                    pcount: this.state.pcount + 1,
                    pname: pnumber,
                });
            }
        } else {
            this.setState({ pcount: this.state.pcount + 1 });
        }
    };

    checkUrl = () => {
        if (!window.location.pathname.split('/')[2]) {
            setTimeout(() => {
                window.location.pathname = `/selection/${shortid.generate()}`;
            }, 1000);
            return;
        } else {
            this.setState({
                roomID: window.location.pathname.split('/')[2],
                room: true,
            });
        }
    };

    setBtnRdy = (p) => {
        let btn = document.querySelector(`.btn${p}`);
        btn.innerHTML = 'ready';
        btn.style.display = 'block';

        let btn1 = document.querySelector('.btnJ1');
        let btn2 = document.querySelector('.btnJ2');
        if (btn1.innerHTML === 'ready' && btn2.innerHTML === 'ready') {
            setTimeout(() => {
                this.setState({ redirect: true });
            }, 500);
        }
    };

    // ThreeJS Scene Function
    updateDimensions = () => {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
    };

    setScene = () => {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.clock = new THREE.Clock();
        this.loader = new GLTFLoader();
        this.scene.background = new THREE.Color('rgb(20, 20, 20)');
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.querySelector('#root').appendChild(this.renderer.domElement);
        this.camera.position.z = 100;
        this.setLight();
    };

    setLight = () => {
        let plight = new THREE.PointLight(0xc4c4c4, 1);
        plight.position.set(0, 300, 500);
        this.scene.add(plight);

        let plight2 = new THREE.PointLight(0xc4c4c4, 1);
        plight2.position.set(500, 100, 0);
        this.scene.add(plight2);

        let plight3 = new THREE.PointLight(0xc4c4c4, 1);
        plight3.position.set(0, 100, -500);
        this.scene.add(plight3);

        let plight4 = new THREE.PointLight(0xc4c4c4, 1);
        plight4.position.set(-500, 300, 0);
        this.scene.add(plight4);
    };

    setModel = () => {
        if (!this.char1) {
            this.loader.load(model, (gltf) => {
                this.char1 = gltf;
                this.mixer = new THREE.AnimationMixer(this.char1.scene);
                let action = this.mixer.clipAction(this.char1.animations[0]);
                action.play();
                this.char1.scene.scale.set(0.15, 0.15, 0.15);
                this.char1.scene.position.set(-window.innerWidth / 24, 2, 0);
                this.scene.add(this.char1.scene);
            });
        }

        if (
            (this.state.pcount > 1 && !this.char2) ||
            this.state.pname === 'J2'
        ) {
            this.loader.load(
                model,
                (gltf) => {
                    this.char2 = gltf;
                    this.mixer2 = new THREE.AnimationMixer(this.char2.scene);
                    let action = this.mixer2.clipAction(
                        this.char2.animations[0]
                    );
                    action.play();
                    this.char2.scene.scale.set(0.15, 0.15, 0.15);
                    this.char2.scene.position.set(window.innerWidth / 24, 2, 0);
                    this.scene.add(this.char2.scene);
                },
                (xhr) => {}
            );
        }
    };

    animate = () => {
        requestAnimationFrame(this.animate);
        var delta = this.clock.getDelta();
        if (this.mixer) this.mixer.update(delta);
        if (this.mixer2) this.mixer2.update(delta);
        if (this.char1) this.char1.scene.rotation.y += 0.012;
        if (this.char2) this.char2.scene.rotation.y += 0.012;
        this.renderer.render(this.scene, this.camera);
    };

    render() {
        if (this.state.redirect) {
            return (
                <Redirect
                    to={{
                        pathname: '/game',
                        state: {
                            pname: this.state.pname,
                            roomID: this.state.roomID,
                        },
                    }}
                />
            );
        }
        if (this.state.roomID) {
            return (
                <section className="selections">
                    <div className="container">
                        <div className="left">
                            <h1> J1 </h1>
                            <button
                                className="btnJ1"
                                onClick={() =>
                                    socket.emit(
                                        'ready',
                                        this.state.roomID,
                                        'J1'
                                    )
                                }
                                style={
                                    this.state.pname !== 'J1'
                                        ? { display: 'none' }
                                        : { display: 'block' }
                                }
                            >
                                Start
                            </button>
                        </div>
                        <div className="right">
                            <h1> J2 </h1>
                            <button
                                className="btnJ2"
                                onClick={() =>
                                    socket.emit(
                                        'ready',
                                        this.state.roomID,
                                        'J2'
                                    )
                                }
                                style={
                                    this.state.pname !== 'J2'
                                        ? { display: 'none' }
                                        : { display: 'block' }
                                }
                            >
                                Start
                            </button>
                        </div>
                    </div>
                    <Chat
                        socket={socket}
                        room={this.state.roomID}
                        pseudo={this.state.pname}
                    />
                </section>
            );
        }

        return <h1 className="loading"> Loading... </h1>;
    }
}

export default Selection;
