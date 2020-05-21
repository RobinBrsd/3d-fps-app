import React, { Component } from 'react';
import './Chat.scss';

class Chat extends Component {
    state = {
        chatSocket: false,
        roomID: this.props.room,
        pseudo: this.props.pseudo,
    };

    componentDidMount = () => {
        console.log(this.state);

        this.input = document.querySelector('#text');
        this.msgContainer = document.querySelector('#msg-container');
        this.log = document.querySelector('.log');
        this.setSocketFunc();
        this.setLog();
        document.addEventListener('keydown', this.sendMessage, false);
    };

    componentDidUpdate = () => {
        this.setSocketFunc();
        // console.log(this.props);
        // if(!)
        // this.setState({
        //     chatSocket: this.props.socket,
        //     input: document.querySelector('#text'),
        //     msgContainer: document.querySelector('#msg-container'),
        //     log: document.querySelector('.log'),
        //     roomID: this.props.room,
        //     pseudo: this.props.pseudo,
        // });
    };

    componentWillUnmount = () => {
        document.removeEventListener('keydown', this.sendMessage);
    };

    setLog = () => {
        if (this.state.pseudo) {
            if (this.log.children.length >= 1) {
                let h1 = document.createElement('h1');
                h1.innerHTML = ` J2 join the room...`;
                this.log.appendChild(h1);
            } else {
                let h1 = document.createElement('h1');
                h1.innerHTML = `${this.state.pseudo} join the room...`;
                this.log.appendChild(h1);
            }
        }
    };

    setSocketFunc = () => {
        if (!this.state.chatSocket) {
            this.setState({ chatSocket: this.props.socket });
        } else if (this.state.chatSocket) {
            if (!this.state.chatSocket._callbacks['$messageReceive'])
                this.state.chatSocket.on('messageReceive', this.getMessage);
        }
    };

    sendMessage = (e) => {
        let keyCode = e.keyCode;
        if (keyCode === 13) {
            if (this.input.value) {
                this.state.chatSocket.emit(
                    'messageSend',
                    this.state.roomID,
                    this.input.value,
                    this.state.pseudo
                );
                this.input.value = '';
            } else this.input.focus();
        }
    };

    getMessage = (msg, player) => {
        var audio = new Audio(require('../Audio/chat.mp3'));
        audio.volume = 0.05;
        audio.play();

        let li = document.createElement('li');
        let span = document.createElement('span');
        let p = document.createElement('p');
        span.innerHTML = player + ' :';
        if (player === 'J1') {
            span.classList.add('j1');
        } else {
            span.classList.add('j2');
        }
        p.innerHTML = msg;
        li.appendChild(span);
        li.appendChild(p);
        this.msgContainer.appendChild(li);
    };

    render() {
        return (
            <div className="chat">
                <div className="log"></div>
                <ul id="msg-container"></ul>
                <input id="text" type="text" autoFocus={true} />
            </div>
        );
    }
}

export default Chat;
