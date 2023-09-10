
// token is used only in production, so it will be null for dev.
let token = null;

// Generate random UID
let uid = String(Math.floor(Math.random() * 10000));
let client;

// Channel that two users will join
let channel;

let queryString = window.location.search;
let urlParams = new URLSearchParams(queryString);
let roomId = urlParams.get('room');

if (!roomId) {
  window.location = 'lobby.html';
}

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

let constraints = {
  video: {
    width: { min: 640, ideal: 1920, max: 1920 },
    height: { min: 480, ideal: 1080, max: 1080 },
  },
  audio: true,
};

let init = async () => {
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  channel = client.createChannel(roomId);
  await channel.join();

  // whenever user calls join method we can trigger 'MemberJoined' event listener.
  channel.on('MemberJoined', handleMemberJoined);
  channel.on('MemberLeft', handleUserLeft);

  // triggered when we recieve message from peer.
  client.on('MessageFromPeer', (message, memberId) => {
    try {
      handleMessageFromPeer(message, memberId);
    } catch (err) {
      console.log('err: ', err);
    }
  });

  // This will get your media data
  localStream = await navigator.mediaDevices.getUserMedia(constraints);

  // user-1 will get his media stream from here
  document.getElementById('user-1').srcObject = localStream;
};

const handleMemberJoined = async (memberId) => {
  console.log('A member has joned:', memberId);

  // Create offer when member joins!
  createOffer(memberId);
};

const handleUserLeft = async (memberId) => {
  document.getElementById('user-2').style.display = 'none';
  document.getElementById('user-1').classList.remove('smallFrame');
};

const handleMessageFromPeer = async (message, memberId) => {
  message = JSON.parse(message.text);

  if (message.type === 'offer') {
    createAnswer(memberId, message.offer);
  }

  if (message.type === 'answer') {
    addAnswer(message.answer);
  }

  if (message.type === 'candidate') {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate);
    }
  }
};

/**
 * creates offer for remote user.
 */
let createOffer = async (memberId) => {
  await createPeerConnection(memberId);
  // The createOffer() method of the RTCPeerConnection interface initiates the creation of
  // an SDP offer for the purpose of starting a new WebRTC connection to a remote peer.
  // SDP - Session Description Protocol
  let offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: 'offer', offer: offer }) },
    memberId
  );
};

let createPeerConnection = async (memberId) => {
  // creates a new peer connection
  peerConnection = new RTCPeerConnection(servers);
  remoteStream = new MediaStream();

  document.getElementById('user-2').srcObject = remoteStream;
  document.getElementById('user-2').style.display = 'block';

  document.getElementById('user-1').classList.add('smallFrame');

  // If we refresh too fast local stream might not get created,
  // so I've added this extra check!
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia(constraints);
    document.getElementById('user-1').srcObject = localStream;
  }

  // add tracks to peerConnection
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Used when remote user add their track
  peerConnection.ontrack = (e) => {
    // add tracks of remote user to remoteStream
    e.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  // setLocalDescription will fire this off and make multiple requests to STUN servers
  // and it will create ICE candidates for us.
  peerConnection.onicecandidate = async (e) => {
    // check if ICE candiate is true
    if (e.candidate)
      client.sendMessageToPeer(
        { text: JSON.stringify({ type: 'candidate', candidate: e.candidate }) },
        memberId
      );
  };
};

// peer will create answer and send back to us
let createAnswer = async (memberId, offer) => {
  await createPeerConnection(memberId);

  await peerConnection.setRemoteDescription(offer);

  // for peer1 local desc is offer and remote desc is answer
  // but for peer2 (recieving peer) it is opposite.
  let answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  client.sendMessageToPeer(
    { text: JSON.stringify({ type: 'answer', answer: answer }) },
    memberId
  );
};

/**
 *
 * @param {*} answer
 * peer1 will set the remote description.
 */
let addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteDescription) {
    peerConnection.setRemoteDescription(answer);
  }
};

let leaveChannel = async () => {
  await channel.leave();
  await client.logout();
};

let toggleCamera = async () => {
  let videoTrack = localStream
    .getTracks()
    .find((track) => track.kind === 'video');

  if (videoTrack.enabled) {
    videoTrack.enabled = false;
    document.getElementById('camera-btn').style.backgroundColor =
      'rgb(255, 80, 80)';
  } else {
    videoTrack.enabled = true;
    document.getElementById('camera-btn').style.backgroundColor = '#b366f9e6';
  }
};
let toggleMic = async () => {
  let audioTrack = localStream
    .getTracks()
    .find((track) => track.kind === 'audio');
  console.log({ audioTrack });
  if (audioTrack?.enabled) {
    audioTrack.enabled = false;
    document.getElementById('mic-btn').style.backgroundColor =
      'rgb(255, 80, 80)';
  } else {
    audioTrack.enabled = true;
    document.getElementById('mic-btn').style.backgroundColor = '#b366f9e6';
  }
};

window.addEventListener('beforeunload', leaveChannel);
document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);

try {
  init();
} catch (err) {
  console.error('Error while init(): \n', err);
}
