import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import MediaHandler from '../MediaHandler';
import Pusher from 'pusher-js';
import Peer from 'simple-peer';

const APP_KEY = '5f4a0f1ff158a01f4409';

export default class App extends Component{
    constructor(){
        super();

        this.state = {
            hasMedia: false,
            otherUserId: null
        };

        this.user = window.user;
        this.user.stream = null;
        this.peers = {};

        this.mediaHandler = new MediaHandler();
        this.setupPusher();

        this.callTo = this.callTo.bind(this);
        this.setupPusher = this.setupPusher.bind(this);
        this.startPeer = this.startPeer.bind(this);

    }

    componentWillMount(){
        this.mediaHandler.getPermissions()
            .then((stream) => {
                this.setState({hasMedia: true});
                this.user.stream = stream;

                try {
                    this.myVideo.srcObject = stream;
                } catch (e){
                    this.myVideo.src = URL.createObjectURL(stream);
                }

                this.myVideo.play();
            })
    }

    setupPusher() {
        Pusher.logToConsole = true;
        this.pusher = new Pusher(APP_KEY, {
            authEndpoint: '/pusher/auth',
            cluster: 'ap1',
            auth: {
                params: this.user.id,
                headers: {
                    'X-CSRF-Token': window.csrfToken
                }
            }
        });

        this.channel = this.pusher.subscribe('presence-videocall');

        this.channel.bind(`client-signal-${this.user.id}`, (signal) =>{
            let peer = this.peers[signal.userId];

            // if peer is not already exists, we got an incoming call
            if (peer === undefined){
                this.setState({otherUserId: signal.userId});
                peer = this.startPeer(signal.userId, false);
            }

            peer.signal(signal.data);
        });
    }

    startPeer(userId, initiator = true) {
        const peer = new Peer({
            initiator,
            stream: this.user.stream,
            trickle: false
        });

        peer.on('signal', (data) => {
            console.log(data);
            this.channel.trigger(`client-signal-${userId}`, {
                type: 'signal',
                userId: this.user.id,
                data: data
            });
        });

        peer.on('stream', (stream) => {
            try {
                this.userVideo.srcObject = stream;
            } catch (e){
                this.userVideo.src = URL.createObjectURL(stream);
            }

            this.userVideo.play();
        });

        peer.on('close', () => {
            let peer = this.peers[userId];
            if(peer !== undefined) {
                peer.destroy();
            }
            this.peers[userId] = undefined;
        });
        return peer;
    }

    callTo(userId) {
        this.peers[userId] = this.startPeer(userId);
    }
    
    toggleMute() {
        this.myVideo.srcObject.getAudioTracks()[0].enabled = !(this.myVideo.srcObject.getAudioTracks()[0].enabled);
        if(this.myVideo.srcObject.getAudioTracks()[0].enabled){
            muteButton.innerText = 'Mute';
        } else {
            muteButton.innerText = 'Unmute';
        }
        
    }
    toggleVid() {

        this.myVideo.srcObject.getVideoTracks()[0].enabled = !(this.myVideo.srcObject.getVideoTracks()[0].enabled);
        if(this.myVideo.srcObject.getVideoTracks()[0].enabled){
            vidButton.innerText = 'Video Disable';
        } else {
            vidButton.innerText = 'Video Enable';
        }
       
    }

    render() {
        return (
        <div className="App">
            {[1,2].map((userId) => {
                return this.user.id !== userId ? <button key={userId} onClick={() => this.callTo(userId)}>Call {userId}</button> : null;
                
        })}
        
            <div className="video-container">
                <video className="my-video" ref={(ref) => {this.myVideo = ref;}}></video>
                <video className="user-video" ref={(ref) => {this.userVideo = ref;}}></video>
            </div>
            <button id="muteButton" className="settings" onClick={() => this.toggleMute()}>Mute</button>
            <button id="vidButton" className="settings" onClick={() => this.toggleVid()}>Video Disable</button>
        </div>
        );
    }
}

if (document.getElementById('app')) {
    ReactDOM.render(<App />, document.getElementById('app'));
}
