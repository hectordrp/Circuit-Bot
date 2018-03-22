// Limitations: The bot can only be in a single call at a time. Multiple
// client crendentials app would be needed to be in multiple calls at
// the same time.

const config = require('electron').remote.require('./config.json');

// Create circuit SDK client instance
const client = new Circuit.Client(config.sandbox.options);

async function stream(user) {
  try {
    let conv = await client.getConversationById(config.sandbox.conversation);
    let call = await client.findCall(conv.rtcSessionId);

    if (!call) {
      call = await client.startConference(config.sandbox.conversation, {audio: false, video: false});
    } else if (call.isRemote) {
      await client.joinConference(call.callId, {audio: false, video: false})
    }

    // Wait 2s second before setting the stream to allow the initial negotiation to finish
    // Alternatively we could also listen for callStatus event of reason sdpConnected
    await sleep(2000);

    // Check if the already streaming on the screenshare stream
    if (!call.localMediaType.desktop) {
      let constraints = { audio: false, video: false };
      // let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      // For Debugging show on index.html page
      /*
      let video = document.querySelector('video');
      video.srcObject = mediaStream;
      video.onloadedmetadata = e => video.play();
      */

      // Send stream on Circuit's screenshare stream. Alternatively use setAudioVideoStream
      // for regular video.
      // await client.setScreenshareStream(call.callId, mediaStream);
      //await client.setAudioVideoStream(call.callId, mediaStream);
        console.log('chivato 3');
    }
  } catch (err) {
    console.error(`${err.name}: ${err.message}`);
  }

  client.addEventListener('itemAdded', function (itemAdded) {
    let convId = itemAdded.item.convId;
    let creatorId = itemAdded.item.creatorId;
    let itemId = itemAdded.item.itemId;
    let content = itemAdded.item.text.content;

      if (creatorId !== user.userId) {
        console.log('no igual', user.emailAddress);
        client.addTextItem(convId, content)
            .then(console.log('text send'));
    }
  });


}

// Helper sleep function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Program (async IIFE function)
(async () => {
  try {
    // Logon
    const user = await client.logon();
      console.log(`Logged on as bot: ${user.emailAddress}`);
      console.log(`bot data: ${JSON.stringify(user)}`);

    // Start conference if not yet started/joined and start streaming
    await stream(user);

    // Ensure call is always up and stream is sent. E.g. bot could have been dropped
    setInterval(async () => await stream(), 10 * 1000);
  } catch (ex) {
    console.error(ex);
  }
})();

// Print all events for debugging
Circuit.supportedEvents.forEach(e => client.addEventListener(e, console.log));

