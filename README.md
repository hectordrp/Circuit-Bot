# BotCorreosDI

Bot basado en [Electron](https://electron.atom.io/).
Ha sido diseñado para ayudar en labores de gestión al equipo de ES_MAD_Correos_DI 

Por ahora tiene las siguientes Features:
* Puede comenzar conferencias, invitando a los participantes que se le indiquen.
* Utiliza el Api [setScreenshareStream](https://circuitsandbox.net/sdk/classes/Client.html#method_setScreenshareStream) para hacer cast de video desde una webCam a una conferencia. (Posible uso en Dailys).
*El bot está preparado para impedir que la llamada se caiga.
* Utiliza el Api de IA de Google [DialogFlow](https://dialogflow.com/), con esta Api puede responder de manera inteligente a las indicaciones que se le hagan, esto hace que el bot sea más "user Friendly". 
```
Por ejemplo podria pedirle lo siguiente: 
     'DiBot, llama a Eugenio' 
     
en vez de utilizar un comando literal como 
     '/call #Eugenio'
```
* También utiliza DialogFlow para responder preguntas relacionadas con la gestión del equipo ( del tipo '¿que día es la planificacion de las subidas a producción?)
* Quedan más Features pendientes de pruebas


> El bot utiliza Electron para poder acceder a la webCam; Electron está basado en node.js y Chromium por lo que puede utilizar la Api de Circuit 'WebRTC' (Utilizando solo NodeJs no se puede acceder a la camara/micro).



### Detalles

> La configuracion del Bot es privada (Tokens de DialogFlow y CircuitSdk), pero si quieres probarlo en tu propia máquina necesitarás lo siguiente:

* Credenciales OAuth (credenciales del Bot)
* Un entorno Linux donde desplegarlo
* La webCam es opcional, pero si lo estas probando en Local puedes utilizar la camara de tu portatil.
* Tu propio DialogFlow Agent configurado con los Intents que neceistes.

> Para arrancarlo: "npm start". 
> Si quieres ver la ventana de Debug de Electron: "npm run dev".
