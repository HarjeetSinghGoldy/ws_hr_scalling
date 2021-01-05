import http from "http";
import ws from "websocket"
import redis from "redis";
const APPID = process.env.APPID;
let connections = [];
let user_id_wsmap = {}
const WebSocketServer = ws.server


const subscriber = redis.createClient({
  port: 6379,
  host: 'rds'
});

const publisher = redis.createClient({
  port: 6379,
  host: 'rds'
});



subscriber.on("subscribe", function (channel, count) {
  console.log(`Server ${APPID} subscribed successfully to livechat`)
  // publisher.publish("livechat", "a message");
});

subscriber.on("message", function (channel, data) {
  try {
    //when we receive a message 
    data = JSON.parse(data)
    console.log("Subscribe on data",data);
    if(data.meta_type=="chat"){
          console.log(`Server ${APPID} received message in channel ${channel} msg: ${data}`);
        let user_ws = user_id_wsmap[data.to_user_id]
        user_ws.send(APPID + ":" + data.chat_message)
    }
    // console.log(`Server ${APPID} received message in channel ${channel} msg: ${message}`);
    // for (const c of connections) {
    //   c.send(APPID + ":" + message)
    // }
  }
  catch (ex) {
    console.log("ERR::" + ex)
  }
});


// subscriber.subscribe("livechat");


//create a raw http server (this will help us create the TCP which will then pass to the websocket to do the job)
const httpserver = http.createServer()

//pass the httpserver object to the WebSocketServer library to do all the job, this class will override the req/res 
const websocket = new WebSocketServer({
  "httpServer": httpserver
})

httpserver.listen(8080, () => console.log("My server is listening on port 8080"))

//when a legit websocket request comes listen to it and get the connection .. once you get a connection thats it! 
websocket.on("request", request => {

  const con = request.accept(null, request.origin)
  con.on("open", () => console.log("opened"))
  con.on("close", () => console.log("CLOSED!!!"))

  con.on("message", message => {
    //publish the message to redis
    console.log("message",message.utf8Data);
    let data = JSON.parse(message.utf8Data)
    if(data.meta_type == "first_time"){

      subscriber.subscribe(`livechat:${data.user_id}`);
      user_id_wsmap[data.user_id] = con
    }
    if(data.meta_type == 'chat'){
      publisher.publish(`livechat:${data.to_user_id}`, message.utf8Data)
    }
    // console.log(`${APPID} Received message ${message.utf8Data}`)
    // publisher.publish("livechat", message.utf8Data)
  })

  // setTimeout(() => con.send(`Connected successfully to server ${APPID}`), 5000)
  setInterval(function(){
    con.send(`Connected successfully to server container ${APPID}`)
    console.log("User ids con map",Object.keys(user_id_wsmap))

  },5000)
  // connections.push(con)
  con.on('close',function(){
    for (const key in user_id_wsmap) {
        const element = user_id_wsmap[key];
        if(element == con){
          delete user_id_wsmap[key]
          subscriber.unsubscribe(`livechat:${data.user_id}`,function(){
            console.log(`Unsubscribing this user_id from redis ${APPID} ${data.user_id}`)
          });
            break;
        }
    }
  })


})

//client code 
//let ws = new WebSocket("ws://localhost:8080");
//ws.onmessage = message => console.log(`Received: ${message.data}`);
//ws.send("Hello! I'm client")


/*
    //code clean up after closing connection
    subscriber.unsubscribe();
    subscriber.quit();
    publisher.quit();
    */
