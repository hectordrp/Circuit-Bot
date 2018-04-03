var request = require('request');
const config = require('electron').remote.require('./config.json');


const accessToken = 'ec76c5b7cec544ee9076a2d7de995aea';

// Create circuit SDK client instance
const client = new Circuit.Client(config.sandbox.options);

async function stream(user) {
    let conv = await client.getConversationById(config.sandbox.conversation);
    let call = await client.findCall(conv.rtcSessionId);

    if (!call) {
        await client.startConference(config.sandbox.conversation, {audio: false, video: false});
    } else if (call.isRemote) {
        await client.joinConference(call.callId, {audio: false, video: false});
    }


}

async function videoStream(user) {
    let conv = await client.getConversationById(config.sandbox.conversation);
    let call = await client.findCall(conv.rtcSessionId);

    if (!call) {
        call = await client.startConference(config.sandbox.conversation, {audio: false, video: false});
    } else if (call.isRemote) {
        await client.joinConference(call.callId, {audio: false, video: false});
    }

    // Wait 2s second before setting the stream to allow the initial negotiation to finish
    // Alternatively we could also listen for callStatus event of reason sdpConnected
    await sleep(2000);

    // Check if the already streaming on the screenshare stream
    if (!call.localMediaType.desktop) {
        let constraints = {audio: false, video: {width: 1920, height: 1080}};
        let mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        // For Debugging show on index.html page
        /*
        let video = document.querySelector('video');
        video.srcObject = mediaStream;
        video.onloadedmetadata = e => video.play();
        */

        // Send stream on Circuit's screenshare stream. Alternatively use setAudioVideoStream
        // for regular video.
        await client.setScreenshareStream(call.callId, mediaStream);
        await client.setAudioVideoStream(call.callId, mediaStream);
    }
}


// Helper sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Program (async IIFE function)
(async () => {
    // Logon
    const user = await client.logon();
    console.log(`Logged on as bot: ${user.emailAddress}`);
    console.log(`bot data: ${JSON.stringify(user)}`);

    client.addEventListener('itemAdded', function (itemAdded) {
        console.log('salta evento');
        let convId = itemAdded.item.convId;
        let creatorId = itemAdded.item.creatorId;
        let itemId = itemAdded.item.itemId;
        let parentId = itemAdded.item.parentItemId;
        let content = itemAdded.item.text.content;

        if (creatorId !== user.userId) {
            console.log('dentro');

            if (content === '/daily') {
                console.log('llamando');
                // Start conference if not yet started/joined and start streaming
                stream(user);

                // Ensure call is always up and stream is sent.
                //setInterval(async () => await stream(), 10 * 1000);

            }
            else if (content === '/exit') {
                // Disconnect conference
                console.log('Desconectando');
                let conv = client.getConversationById(config.sandbox.conversation);
                client.findCall(conv.rtcSessionId)
                    .then((call = call) => {
                        console.log(call);
                        client.leaveConference(call.callId);
                    });
            }
            else if (content === '/video') {
                console.log('Video llamada');
                // Start conference if not yet started/joined and start streaming
                videoStream(user);

                // Ensure call is always up and stream is sent.
                //setInterval(async () => await stream(), 10 * 1000);
            }
            else {
                console.log('Mandando a Api');
                let options = {
                    // url: 'https://api.dialogflow.com/v1/query',
                    url: 'https://api.dialogflow.com/v1/query?v=20170712&query=' + content + '&lang=es&sessionId=eeb47626-8603-41e4-abee-ca59ed842bec&timezone=Atlantic/Canary',
                    headers: {
                        "Authorization": "Bearer " + accessToken
                    }
                    // body: JSON.stringify({query: content, lang: "es", sessionId: "eeb47626-8603-41e4-abee-ca59ed842be"})
                };

                function callback(error, response, body) {
                    console.log('callback', response);
                    if (!error && response.statusCode === 200) {
                        let info = JSON.parse(body);
                        console.log("body: ", info);


                        let responseMessage = {
                            parentId: selectId(),
                            content: info.result.fulfillment.speech
                        };
                        client.addTextItem(convId, responseMessage)
                            .then(console.log('text send'));
                    }
                }

                function selectId () {
                    if (parentId) {
                        return parentId;
                        console.log('parent');
                    } else {
                        return itemId;
                        console.log('item');

                    }
                }
                console.log('request');
                request(options, callback);

            }
        }
    });
})();

// Print all events for debugging
Circuit.supportedEvents.forEach(e => client.addEventListener(e, console.log));