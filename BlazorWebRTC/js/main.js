'use strict';

const videoElement = document.getElementById('video');
const audioInputSelect = document.querySelector('select#audioSource');
const audioOutputSelect = document.querySelector('select#audioOutput');
const videoSelect = document.querySelector('select#videoSource');
const selectors = [audioInputSelect, audioOutputSelect, videoSelect];
const canvas = document.getElementById('canvas');
const blurBtn = document.getElementById('blur-btn');
const unblurBtn = document.getElementById('unblur-btn');
const ctx = canvas.getContext('2d');

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
    //let mediaStreamBlur = await navigator.mediaDevices.getUserMedia(constraints);
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
        .catch(err => console.log(err))
}

async function perform(net) {
    const segmentation = await net.segmentPerson(videoElement);

    const backgroundBlurAmount = 6;
    const edgeBlurAmount = 2;
    const flipHorizontal = true;

    bodyPix.drawBokehEffect(
        canvas, videoElement, segmentation, backgroundBlurAmount,
        edgeBlurAmount, flipHorizontal);

    if (true) {
        requestAnimationFrame(() => { perform(net); } );
    }
}