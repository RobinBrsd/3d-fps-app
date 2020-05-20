import React, { useEffect, useState } from 'react';
import './Chat.scss';

function Chat(props) {
    const [chatSocket, setSocket] = useState(null);
    var input, msgContainer, log, roomID, pseudo;

    useEffect(() => {
        roomID = props.room;
        msgContainer = document.querySelector('#msg-container');

        setSocketFunc();
        return () => {
            document.removeEventListener('keydown', sendMessage);
        };
    }, [chatSocket]);

    useEffect(() => {
        pseudo = props.pseudo;
        roomID = props.room;
        input = document.querySelector('#text');
        log = document.querySelector('.log');
        document.removeEventListener('keydown', sendMessage);
        document.addEventListener('keydown', sendMessage, false);
        setLog();
    }, [props]);

    const setLog = () => {
        if (pseudo) {
            if (log.children.length >= 1) {
                let h1 = document.createElement('h1');
                h1.innerHTML = ` J2 join the room...`;
                log.appendChild(h1);
            } else {
                let h1 = document.createElement('h1');
                h1.innerHTML = `${pseudo} join the room...`;
                log.appendChild(h1);
            }
        }
    };

    const setSocketFunc = () => {
        if (!chatSocket) {
            setSocket(props.socket);
        } else if (chatSocket) {
            chatSocket.on('messageReceive', getMessage);
        }
    };

    const sendMessage = (e) => {
        let keyCode = e.keyCode;
        if (keyCode === 13) {
            if (input.value) {
                chatSocket.emit('messageSend', roomID, input.value, pseudo);
                input.value = '';
            } else input.focus();
        }
    };

    const getMessage = (msg, player) => {
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
        msgContainer.appendChild(li);
    };

    return (
        <div className="chat">
            <div className="log"></div>
            <ul id="msg-container"></ul>
            <input id="text" type="text" autoFocus={true} />
        </div>
    );
}

export default Chat;
