'use strict';

const videoElement = document.getElementById('video');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const blurBtn = document.getElementById('blur-btn');
const unblurBtn = document.getElementById('unblur-btn');

const canvasImg = document.getElementById('canvasImg');
const ctxImg = canvasImg.getContext('2d');
const backgroundImg = new Image();
backgroundImg.src = '../images/default.jpg';

const roomName = document.getElementById('roomName');
const connectRoomBtn = document.getElementById('connectRoom');
const remoteVideo = document.getElementById('remoteVideo');
let signaling, pc;

const msg = document.getElementById('msg');
const sendMsgBtn = document.getElementById('sendMsg');
const word = document.getElementById('word');

// 裝置設定
(async () => {
    const audioSource = audioInputSelect.value;
    const videoSource = videoSelect.value;
    const constraints = {
        audio: { deviceId: audioSource ? { exact: audioSource } : undefined },
        video: { deviceId: videoSource ? { exact: videoSource } : undefined }
    };

    // 取得所有裝置
    let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
    let deviceInfos = await navigator.mediaDevices.enumerateDevices();
    console.log('Get Local Device : ', deviceInfos);

    // 分類
    const values = selectors.map(select => select.value);
    selectors.forEach(select => {
        while (select.firstChild) {
            select.removeChild(select.firstChild);
        }
    });
    for (let i = 0; i < deviceInfos.length; i++) {
        const deviceInfo = deviceInfos[i];
        const option = document.createElement('option');
        option.value = deviceInfo.deviceId;
        if (deviceInfo.kind === 'audioinput') {
            option.text = deviceInfo.label || `microphone ${audioInputSelect.length + 1}`;
            audioInputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'audiooutput') {
            option.text = deviceInfo.label || `speaker ${audioOutputSelect.length + 1}`;
            audioOutputSelect.appendChild(option);
        } else if (deviceInfo.kind === 'videoinput') {
            option.text = deviceInfo.label || `camera ${videoSelect.length + 1}`;
            videoSelect.appendChild(option);
        } else {
            console.log('Some other kind of source/device: ', deviceInfo);
        }
    }
    selectors.forEach((select, selectorIndex) => {
        if (Array.prototype.slice.call(select.childNodes).some(n => n.value === values[selectorIndex])) {
            select.value = values[selectorIndex];
        }
    });

    // 輸入音源測試
    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(mediaStream);
    const scriptProcessor = audioContext.createScriptProcessor(2048, 1, 1);
    analyser.smoothingTimeConstant = 0.8;
    analyser.fftSize = 1024;
    microphone.connect(analyser);
    analyser.connect(scriptProcessor);
    scriptProcessor.connect(audioContext.destination);
    scriptProcessor.onaudioprocess = function () {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        const arraySum = array.reduce((a, value) => a + value, 0);
        const average = arraySum / array.length;
        // console.log(Math.round(average));
        const allPids = [...document.querySelectorAll('.pid')];
        const numberOfPidsToColor = Math.round(average / 10);
        const pidsToColor = allPids.slice(0, numberOfPidsToColor);
        for (const pid of allPids) {
            pid.style.backgroundColor = "#e6e7e8";
        }
        for (const pid of pidsToColor) {
            pid.style.backgroundColor = "#69ce2b";
        }
    };

    window.stream = mediaStream; // make stream available to console
    videoElement.srcObject = mediaStream;

    // 背景模糊
    loadBodyPix();
    //blurBtn.addEventListener('click', e => {

    //    videoElement.hidden = true;
    //    canvas.hidden = false;
    //    blurBtn.hidden = true;
    //    loadBodyPix();
    //});

    // 背景圖片
    loadBodyImgPix();

    connectRoomBtn.addEventListener('click', e => {
        console.log(roomName.value);
        signalingControl(roomName.value, mediaStream);
        signaling.postMessage({ type: 'ready' });
    });

    sendMsgBtn.addEventListener('click', e => {
        /*console.log(word.innerHTML);*/
        //if (signaling) {

        //}
        signaling.postMessage({ type: 'commandMessage', message: msg.value });
        
    });
})();

function loadBodyPix() {
    let options = {
        architecture: 'MobileNetV1',
        multiplier: 0.75,
        stride: 32,
        quantBytes: 4
    }
    bodyPix.load(options)
        .then(net => perform(net))
        .catch(err => console.log(err));
}

async function perform(net) {

    ////while (startBtn.disabled && blurBtn.hidden) {
    ////    const segmentation = await net.segmentPerson(video);

    ////    const backgroundBlurAmount = 6;
    ////    const edgeBlurAmount = 2;
    ////    const flipHorizontal = true;

    ////    bodyPix.drawBokehEffect(
    ////        canvas, videoElement, segmentation, backgroundBlurAmount,
    ////        edgeBlurAmount, flipHorizontal);
    ////}
    //while (true) {
    //    const segmentation = await net.segmentPerson(videoElement);

    //    const backgroundBlurAmount = 6;
    //    const edgeBlurAmount = 2;
    //    const flipHorizontal = true;

    //    bodyPix.drawBokehEffect(
    //        canvas, videoElement, segmentation, backgroundBlurAmount,
    //        edgeBlurAmount, flipHorizontal);
    //}
    //while (startBtn.disabled && blurBtn.hidden) {
    //    const segmentation = await net.segmentPerson(video);

    //    const backgroundBlurAmount = 6;
    //    const edgeBlurAmount = 2;
    //    const flipHorizontal = true;

    //    bodyPix.drawBokehEffect(
    //        canvas, videoElement, segmentation, backgroundBlurAmount,
    //        edgeBlurAmount, flipHorizontal);
    //}
    const segmentation = await net.segmentPerson(videoElement);

    const backgroundBlurAmount = 6;
    const edgeBlurAmount = 2;
    const flipHorizontal = true;

    bodyPix.drawBokehEffect(
        canvas, videoElement, segmentation, backgroundBlurAmount,
        edgeBlurAmount, flipHorizontal);

    if (true) {
        requestAnimationFrame(() => { perform(net); });
    }
}

function loadBodyImgPix() {
    let options = {
        architecture: 'MobileNetV1',
        multiplier: 0.75,
        stride: 32,
        quantBytes: 4
    }
    bodyPix.load(options)
        .then(net => performImg(net))
        .then(console.log('is done'))
        .catch(err => console.log(err));
}

async function performImg(net) {
    const foregroundColor = { r: 0, g: 0, b: 0, a: 0 }    // 前景色  设为完全透明
    const backgroundColor = { r: 0, g: 0, b: 0, a: 255 }   // 背景色
    const segmentation = await net.segmentPerson(videoElement);
    let backgroundDarkeningMask = bodyPix.toMask(
        segmentation,
        foregroundColor,
        backgroundColor
    );
    ctxImg.putImageData(backgroundDarkeningMask, 0, 0);
    ctxImg.globalCompositeOperation = 'source-in'; // 新图形只在重合区域绘制
    ctxImg.drawImage(backgroundImg, 0, 0, videoElement.width, videoElement.height);
    ctxImg.globalCompositeOperation = 'destination-over'; // 新图形只在不重合的区域绘制
    ctxImg.drawImage(videoElement, 0, 0, videoElement.width, videoElement.height);
    ctxImg.globalCompositeOperation = 'source-over'; // 恢复
    if (true) {
        requestAnimationFrame(() => { performImg(net); });
    }
    //if (this.radio === 3) {
    //    requestAnimationFrame(
    //        this.replaceBackground
    //    )
    //} else {
    //    this.clearCanvas(this.videoCanvas)
    //}
}

function signalingControl(channelName, localStream) {
    signaling = new BroadcastChannel(roomName.value);
    signaling.onmessage = e => {
        if (!localStream) {
            console.log('not ready yet');
            return;
        }
        switch (e.data.type) {
            case 'offer':
                handleOffer(e.data);
                break;
            case 'answer':
                handleAnswer(e.data);
                break;
            case 'candidate':
                handleCandidate(e.data);
                break;
            case 'ready':
                // A second tab joined. This tab will initiate a call unless in a call already.
                if (pc) {
                    console.log('already in call, ignoring');
                    return;
                }
                makeCall();
                break;
            //case 'bye':
            //    if (pc) {
            //        hangup();
            //    }
            //    break;
            case 'commandMessage':
                word.innerHTML = e.data.message;
                break;
            default:
                console.log('unhandled', e);
                break;
        }
    };

    function createPeerConnection() {
        pc = new RTCPeerConnection();
        pc.onicecandidate = e => {
            const message = {
                type: 'candidate',
                candidate: null,
            };
            if (e.candidate) {
                message.candidate = e.candidate.candidate;
                message.sdpMid = e.candidate.sdpMid;
                message.sdpMLineIndex = e.candidate.sdpMLineIndex;
            }
            signaling.postMessage(message);
        };
        pc.ontrack = e => remoteVideo.srcObject = e.streams[0];
        localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    }

    async function makeCall() {
        await createPeerConnection();

        const offer = await pc.createOffer();
        signaling.postMessage({ type: 'offer', sdp: offer.sdp });
        await pc.setLocalDescription(offer);
    }

    async function handleOffer(offer) {
        if (pc) {
            console.error('existing peerconnection');
            return;
        }
        await createPeerConnection();
        await pc.setRemoteDescription(offer);

        const answer = await pc.createAnswer();
        signaling.postMessage({ type: 'answer', sdp: answer.sdp });
        await pc.setLocalDescription(answer);
    }

    async function handleAnswer(answer) {
        if (!pc) {
            console.error('no peerconnection');
            return;
        }
        await pc.setRemoteDescription(answer);
    }

    async function handleCandidate(candidate) {
        if (!pc) {
            console.error('no peerconnection');
            return;
        }
        if (!candidate.candidate) {
            await pc.addIceCandidate(null);
        } else {
            await pc.addIceCandidate(candidate);
        }
    }
}
