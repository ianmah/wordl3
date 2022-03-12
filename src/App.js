import React, { useEffect, useState } from 'react';
import Keyboard from './components/Keyboard';
import './App.css';

const IPFS = require('ipfs')

function App() {


  useEffect(() => {
    const init = async () => {
      
      const ipfs = await IPFS.create({
          repo: 'ok' + Math.random(),
          EXPERIMENTAL: {
            pubsub: true,
            ipnsPubsub: true,
          },
          config: {
            Addresses: {
              Swarm: [ '/dns4/star.thedisco.zone/tcp/9090/wss/p2p-webrtc-star', '/dns6/star.thedisco.zone/tcp/9090/wss/p2p-webrtc-star' ]
            }
          }
      })
      
      // processes a circuit-relay announce over pubsub
      async function processAnnounce(addr) {
        console.log(addr)
        // get our peerid
        const me = (await ipfs.id()).id
        console.log(me)

        // not really an announcement if it's from us
        if (addr.from === me) {
            return;
        }

        // if we got a keep-alive, nothing to do
        if (addr === "keep-alive") {
            console.log(addr);
            return;
        }

        const peer = addr.from;
        console.log("Peer: " + peer);
        console.log("Me: " + me);
        if (peer === me) { // return if the peer being announced is us
            return;
        }

        // get a list of peers
        const peers = await ipfs.swarm.peers();
        for (let i in peers) {
            // if we're already connected to the peer, don't bother doing a
            // circuit connection
            if (peers[i].peer === peer) {
                return;
            }
        }
        // log the address to console as we're about to attempt a connection
        console.log(addr);

        // connection almost always fails the first time, but almost always
        // succeeds the second time, so we do this:
        try {
            await ipfs.swarm.connect(addr);
        } catch(err) {
            console.log(err);
            await ipfs.swarm.connect(addr);
        }
      }

			// process announcements over the relay network, and publish our own keep-alives to keep the channel alive
      // await ipfs.pubsub.subscribe("announce-circuit", processAnnounce);
      // setInterval(function(){ipfs.pubsub.publish("announce-circuit", "peer-alive");}, 15000);

        function echo(msg) {
          // msg = new TextDecoder().decode(msg.data);
          console.log(msg);
        }
        
        await ipfs.pubsub.subscribe("example_topic3", echo);

        await ipfs.pubsub.publish("example_topic3", "Hello world!");

    }

    init()
  })

  return (
    <div className="App">

    </div>
  );
}

export default App;
