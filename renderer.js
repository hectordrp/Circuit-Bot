var request = require('request');
// Specify the file circuit.js which is the browser SDK to get access to WebRTC APIs.
const Circuit = require('circuit-sdk/circuit.js');

const config = require('electron').remote.require('./config.json');


const accessToken = 'ec76c5b7cec544ee9076a2d7de995aea';

// Create circuit SDK client instance
const client = new Circuit.Client(config.sandbox.options);


//Circuit Call function
async function stream(user) {
    let conv = await client.getConversationById(config.sandbox.conversation);
    let call = await client.findCall(conv.rtcSessionId);

    if (!call) {
        await client.startConference(config.sandbox.conversation, {audio: false, video: false});
    } else if (call.isRemote) {
        await client.joinConference(call.callId, {audio: false, video: false});
    }


}

//Circuit Video function
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

// Bot features
(async () => {
    // Logon
    console.log("logeando");
    const user = await client.logon();
    console.log(`Logged on as bot: ${user.emailAddress}`);
    //console.log(`bot data: ${JSON.stringify(user)}`);



//Circuit Events

    //Item Updated Event
    client.addEventListener('itemUpdated', function (itemUpdated) {
        console.log('Item Actualizado ->', itemUpdated);

        //text example:
        //  "a<hr/>leluya"

        let itemConfig = {
            dibotId: '5b345359-0bc6-49fd-893a-3e7e7da77208',
            convId: itemUpdated.item.convId,
            creatorId: itemUpdated.item.creatorId,
            itemId: itemUpdated.item.itemId,
            parentId: itemUpdated.item.parentItemId,
            content: itemUpdated.item.text.content
        };


        let regex = itemUpdated.item.text.content.replace(/.*<hr>/g,'');
        console.log(regex);
        if (itemConfig.creatorId !== user.userId) {
            if (manageCommands(itemConfig.content)) {
                //console.log('ok');
            }
            else {
                smallTalk(itemConfig);
            }
        }
    });

    // Mention Event
    client.addEventListener('mention', function (mention) {
        console.log('Mencion ->', mention);
        // console.log(itemAdded.item.text.mentionedUsers.length);
        // for (let i = 0; i< itemAdded.item.text.mentionedUsers.length; i++) {
        //     console.log('index: ', i);
        // }
    });

    //Item Added Event:
    client.addEventListener('itemAdded', function (itemAdded) {
        console.log('Item nuevo -> ', itemAdded);
        let itemConfig = {
            dibotId: '5b345359-0bc6-49fd-893a-3e7e7da77208',
            convId: itemAdded.item.convId,
            creatorId: itemAdded.item.creatorId,
            itemId: itemAdded.item.itemId,
            parentId: itemAdded.item.parentItemId,
            content: itemAdded.item.text.content
        };


        if (itemConfig.creatorId !== user.userId) {
            if (manageCommands(itemConfig.content)) {
                //console.log('ok');
            }
            else {
                smallTalk(itemConfig);
            }
        }
    });



//Functions & Utils

    //Command features
    function manageCommands(content) {
        if (content === '/daily') {
            console.log('[Daily] -> Iniciando conferencia');
            // Start conference if not yet started/joined and start streaming
            stream(user);

            // Uncomment line below to Ensure call is always up and stream is sent:
            //setInterval(async () => await stream(), 10 * 1000);
            return true;

        }
        else if (content === '/exit') {
            // Disconnect conference
            console.log('[Exit] -> Desconectando conferencia');
            let conv = client.getConversationById(config.sandbox.conversation);
            client.findCall(conv.rtcSessionId)
                .then((call = call) => {
                    console.log(call);
                    client.leaveConference(call.callId);
                });
            return true;
        }
        else if (content === '/video') {
            console.log('[Video] -> Iniciando Video-Conferencia');
            // Start conference if not yet started/joined and start streaming
            videoStream(user);

            // Ensure call is always up and stream is sent.
            //setInterval(async () => await stream(), 10 * 1000);
            return true;
        }
    }

    //Tell if the item is from a new topic
    function selectId(itemConfig) {
        if (itemConfig.parentId) {
            //Has a parentId, so is not from a new topic
            return itemConfig.parentId;
        } else {
            //New topic
            return itemConfig.itemId;
        }
    }

    //Call the DialogFlow Dibot SmallTalk api
    function smallTalk(itemConfig) {
        let options = {
            url: 'https://api.dialogflow.com/v1/query?v=20170712&query=' + itemConfig.content + '&lang=es&sessionId=eeb47626-8603-41e4-abee-ca59ed842bec&timezone=Atlantic/Canary',
            headers: {
                "Authorization": "Bearer " + accessToken
            }
        };

        //Request to DialogFlow, then manage the callback
        request(options, DialogFlowCallback.bind(itemConfig));
    }


    //Callback with response message and status
    function DialogFlowCallback(error, response, body) {
        let itemConfig = this;
        if (!error && response.statusCode === 200) {
            let info = JSON.parse(body);
            // console.log("Envío a DialogFlow -> ", info);

            let responseMessage = {
                parentId: selectId(itemConfig),
                content: info.result.fulfillment.speech
            };
            if (responseMessage && responseMessage.content !== "") {
                client.addTextItem(this.convId, responseMessage)
                    .then(console.log('Respuesta DialogFlow -> ', responseMessage));
            }

            if (info.result.metadata.intentName == "videoconference") {
                console.log('[Video] -> Iniciando Video-Conferencia');
                videoStream(user);
            }

            if (info.result.metadata.intentName == "closevideo") {
                console.log('[Exit] -> Desconectando conferencia');

                let conv = client.getConversationById(config.sandbox.conversation);
                client.findCall(conv.rtcSessionId)
                    .then((call = call) => {
                        console.log(call);
                        client.leaveConference(call.callId);
                    });
            }
        }
    }
})();

// Print all events for debugging
Circuit.supportedEvents.forEach(e => client.addEventListener(e, console.log));