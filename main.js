let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
};

let init = async () => {
  // This will get your media data
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  // user-1 will get his media stream from here
  document.getElementById('user-1').srcObject = localStream;

  createOffer();
};

/**
 * creates offer for remote user.
 */
let createOffer = async () => {
  // creates a new peer connection
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();

  document.getElementById('user-2').srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Used when remote user add their track
  peerConnection.ontrack = (event) => {};

  // The createOffer() method of the RTCPeerConnection interface initiates the creation of
  // an SDP offer for the purpose of starting a new WebRTC connection to a remote peer.
  // SDP - Session Description Protocol
  let offer = await peerConnection.createOffer();
  console.log({ peerConnection });
  await peerConnection.setLocalDescription(offer);
};

init();
