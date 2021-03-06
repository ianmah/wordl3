import React, { useState, useEffect } from 'react';
import './App.css';
import Keyboard from './components/Keyboard';
import { wordList } from './constants/data';
import { v4 as uuid } from 'uuid';
import { create as IpfsHttpClient } from 'ipfs-http-client'
import { toString as uint8ArrayToString } from "uint8arrays/to-string";
import Modal from 'react-bootstrap/Modal'
import Button from 'react-bootstrap/Button'
import Achievements from './components/Achievements';
import axios from 'axios'

// const ID = Math.random().toFixed(6)
const TOPIC = 'wordl3-comms-1231212'
let correctCharArray = []
let presentCharArray = []
let absentCharArray = []

const App = () => {
  const [boardData, setBoardData] = useState(JSON.parse(localStorage.getItem("board-data")));
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(false);
  const [charArray, setCharArray] = useState([]);
  const [ipfs, setIpfs] = useState();
  const [clientId, setClientId] = useState('');
  const [solution, setSolution] = useState('');
  const [peerConnected, setPeerConnected] = useState('');
  const [score, setScore] = useState({});
  const [modalShow, setModalShow] = useState(false);

  const [NFTMintData, setNFTMintData] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');


  const resetBoard = () => {
    var alphabetIndex = Math.floor(Math.random() * 26);
    var wordIndex = Math.floor(Math.random() * wordList[String.fromCharCode(97 + alphabetIndex)].length);
    let newBoardData = {
      ...boardData, "solution": wordList[String.fromCharCode(97 + alphabetIndex)][wordIndex],
      "rowIndex": 0,
      "boardWords": [],
      "boardRowStatus": [],
      "presentCharArray": [],
      "absentCharArray": [],
      "correctCharArray": [],
      "status": "IN_PROGRESS"
    };
    setBoardData(newBoardData);
    localStorage.setItem("board-data", JSON.stringify(newBoardData));
  }

  async function send(msg) {
    if (!msg) throw new Error('Missing message')
    if (!TOPIC) throw new Error('Subscribe to a topic first')
    // if (!ipfs) throw new Error('Connect to a node first')

    console.log(`Sending message to ${TOPIC}...`)
    await ipfs.pubsub.publish(TOPIC, JSON.stringify(msg))
    // console.log(`<span class="green">Success!</span>`)
  }


  async function subscribe(nextTopic) {
    if (!nextTopic) throw new Error('Missing topic name')
    // if (!ipfs) throw new Error('Connect to a node first')

    const lastTopic = TOPIC

    // if (TOPIC) {
    //   // TOPIC = null
    //   console.log(`Unsubscribing from TOPIC ${lastTopic}`)
    //   await ipfs.pubsub.unsubscribe(lastTopic)
    // }

    console.log(`Subscribing to ${nextTopic}...`)

    await ipfs.pubsub.subscribe(TOPIC, msg => {
      // const from = msg.from
      // const seqno = uint8ArrayToString(msg.seqno, 'base16')
      // if (from === peerId) return console.log(`Ignoring message ${seqno} from self`)

      // console.log(`Message ${seqno} from ${from}:`)

      try {
        // console.log('msg was', JSON.stringify(uint8ArrayToString(msg.data), null, 2))
        const parsedData = JSON.parse(uint8ArrayToString(msg.data))

        if (parsedData.clientId === clientId) {
          console.log('ignore')
        } else {

          console.log(parsedData)

          if (parsedData.type === 'guess') {
            enterBoardWord(parsedData.word)
          } else if (parsedData.type === 'score') {
            setScore(parsedData)
          } else if (parsedData.type === 'peer') {
            setPeerConnected(true)
          }


        }
      } catch (_) {
        // console.log(uint8ArrayToString(msg.data, 'base16'))
      }
    })

    // TOPIC = nextTopic
  }

  async function mintNFT() {
    console.log("mint nft")
  }

  useEffect(() => {
    console.log('scoreChanged', score)
    if (!score.word) return;
    let rowIndex = boardData.rowIndex;
    let boardRowStatus = boardData.boardRowStatus
    let boardWords = boardData.boardWords
    boardRowStatus.push(score.score);
    console.log('scoreChanged', score)
    boardWords[rowIndex] = `${score.word}`;
    rowIndex++
    
    setBoardData({
      ...boardData,
      rowIndex,
      boardRowStatus,
      boardWords,
      presentCharArray: [...boardData.presentCharArray, ...score.presentCharArray],
      correctCharArray: [...boardData.correctCharArray, ...score.correctCharArray],
      absentCharArray: [...boardData.absentCharArray, ...score.absentCharArray],
    })
    if (score.score) {
      for (var index = 0; index < 5; index++) {
        if (score.score[index] !== 'correct') {
          return;
        }
      }
      
      setModalShow(true)
    }
  }, [score])


  useEffect(() => {
    const windowInput = window.prompt('enter a 5 letter word', 'crane')
    console.log(windowInput)
    setSolution(windowInput)
    if (!boardData || !boardData.solution) {
      var alphabetIndex = Math.floor(Math.random() * 26);
      var wordIndex = Math.floor(Math.random() * wordList[String.fromCharCode(97 + alphabetIndex)].length);
      let newBoardData = {
        ...boardData, "solution": wordList[String.fromCharCode(97 + alphabetIndex)][wordIndex],
        "rowIndex": 0,
        "boardWords": [],
        "boardRowStatus": [],
        "presentCharArray": [],
        "absentCharArray": [],
        "correctCharArray": [],
        "status": "IN_PROGRESS"
      };
      setBoardData(newBoardData);
      localStorage.setItem("board-data", JSON.stringify(newBoardData));
    }

    const small_id = uuid().slice(0, 6) //This is to generate a room code
    setClientId(small_id)
    let ipfs
    let peerId

    console.log("The unique id that was generated: " + small_id)

    async function reset() {
      if (ipfs && TOPIC) {
        console.log(`Unsubscribing from TOPIC ${TOPIC}`)
        await ipfs.pubsub.unsubscribe(TOPIC)
      }

      peerId = null
      ipfs = null
    }

    async function nodeConnect(url) {
      await reset()
      console.log(`Connecting to ${url}`)
      ipfs = IpfsHttpClient(url)
      setIpfs(ipfs)
      const { id, agentVersion } = await ipfs.id()
      peerId = id
      // console.log(`<span class="green">Success!</span>`)
      console.log(`Version ${agentVersion}`)
      console.log(`Peer ID ${id}`)

    }


    nodeConnect('/ip4/127.0.0.1/tcp/5002')

  }, []);

  useEffect(()=> {
    async function mintNFT(contractAddress) {
      const options = {
        method: 'POST',
        url: 'https://api.nftport.xyz/v0/mints/easy/urls',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'e53c7e69-eb94-4906-b02a-82bb39a1adb6'
        },
        data: {
          chain: 'polygon',
          name: 'Wordl3',
          description: 'You successfully guessed a wordle!!!',
          file_url: 'https://ipfs.io/ipfs/bafkreiczwotfdnf25l3qor7tlduo3j5tsrxf7b5qlkqnil5dxjksmn6ea4',
          mint_to_address: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'
        }
      };
      
      axios.request(options).then(function (response) {
        console.log(response.data);
        setNFTMintData(response)
      }).catch(function (error) {
        console.error(error);
      });
  
  
    }
  }, []);

  useEffect(() => {

    async function initMessages() {
      if (ipfs) {
        await subscribe(TOPIC)
        // await send(`hello from stan's mac, ${clientId}`)
        setInterval(async () => {
          if (solution) {
            await send({
              type: 'peer',
              clientId
            })

          }
        }, 1000);
      }
    }
    initMessages()

  }, [ipfs])

  const handleMessage = (message) => {
    setMessage(message);
    setTimeout(() => {
      setMessage(null);
    }, 3000);
  }

  const handleError = () => {
    setError(true);
    setTimeout(() => {
      setError(false);
    }, 2000);
  }

  const handleWord = async (word) => {
    await send({
      type: 'guess',
      word,
      clientId
    })
  }


  const enterBoardWord = async (word) => {
    let score = []
    for (var index = 0; index < word.length; index++) {
      if (solution.charAt(index) === word.charAt(index)) {
        score.push('correct')
        if (!correctCharArray.includes(word.charAt(index))) correctCharArray.push(word.charAt(index));
        if (presentCharArray.indexOf(word.charAt(index)) !== -1) presentCharArray.splice(presentCharArray.indexOf(word.charAt(index)), 1);
      } else if (solution.includes(word.charAt(index))) {
        score.push('present')
        if (!correctCharArray.includes(word.charAt(index))
          && !presentCharArray.includes(word.charAt(index))) presentCharArray.push(word.charAt(index));
      } else {
        score.push("absent");
        if (!absentCharArray.includes(word.charAt(index))) absentCharArray.push(word.charAt(index));
      }
    }

    console.log(score)
    await send({
      type: 'score',
      word,
      score,
      clientId,
      presentCharArray,
      absentCharArray,
      correctCharArray
    })

  }

  const enterBoardWord2 = async (word) => {
    let boardWords = boardData.boardWords;
    let boardRowStatus = boardData.boardRowStatus;
    let solution = boardData.solution;
    let presentCharArray = boardData.presentCharArray;
    let absentCharArray = boardData.absentCharArray;
    let correctCharArray = boardData.correctCharArray;
    let rowIndex = boardData.rowIndex;
    let rowStatus = [];
    let matchCount = 0;
    let status = boardData.status;

    for (var index = 0; index < word.length; index++) {
      if (solution.charAt(index) === word.charAt(index)) {
        matchCount++;
        rowStatus.push("correct");
        if (!correctCharArray.includes(word.charAt(index))) correctCharArray.push(word.charAt(index));
        if (presentCharArray.indexOf(word.charAt(index)) !== -1) presentCharArray.splice(presentCharArray.indexOf(word.charAt(index)), 1);
      } else if (solution.includes(word.charAt(index))) {
        rowStatus.push("present");
        if (!correctCharArray.includes(word.charAt(index))
          && !presentCharArray.includes(word.charAt(index))) presentCharArray.push(word.charAt(index));
      } else {
        rowStatus.push("absent");
        if (!absentCharArray.includes(word.charAt(index))) absentCharArray.push(word.charAt(index));
      }
    }
    if (matchCount === 5) {
      status = "WIN";
      handleMessage("YOU WON")
    }
    else if (rowIndex + 1 === 6) {
      status = "LOST";
      handleMessage(boardData.solution)
    }
    boardRowStatus.push(rowStatus);
    boardWords[rowIndex] = word;
    let newBoardData = {
      ...boardData,
      "boardWords": boardWords,
      "boardRowStatus": boardRowStatus,
      "rowIndex": rowIndex + 1,
      "status": status,
      "presentCharArray": presentCharArray,
      "absentCharArray": absentCharArray,
      "correctCharArray": correctCharArray
    };
    setBoardData(newBoardData);
    localStorage.setItem("board-data", JSON.stringify(newBoardData));
  }

  const enterCurrentText = (word) => {
    let boardWords = boardData.boardWords;
    let rowIndex = boardData.rowIndex;
    boardWords[rowIndex] = word;
    let newBoardData = {
      ...boardData,
      "boardWords": boardWords
    };
    setBoardData(newBoardData);
  }

  const handleKeyPress = (key) => {
    if (boardData.rowIndex > 5 || boardData.status === "WIN") return;
    if (key === "ENTER") {
      if (charArray.length === 5) {
        let word = charArray.join("").toLowerCase();
        if (!wordList[word.charAt(0)].includes(word)) {
          handleError();
          handleMessage("Not in word list");
          return;
        }
        handleWord(word);
        setCharArray([]);
      } else {
        handleMessage("Not enough letters");
      }
      return;
    }
    if (key === "???") {
      charArray.splice(charArray.length - 1, 1);
      setCharArray([...charArray]);
    }
    else if (charArray.length < 5) {
      charArray.push(key);
      setCharArray([...charArray]);
    }
    enterCurrentText(charArray.join("").toLowerCase());
  }
  
  function MyVerticallyCenteredModal(props) {
    return (
      <Modal
        {...props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
            Achievements
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Achievements />
          <h4>NFT Mint Data</h4>
          <p>
          {NFTMintData}
          </p>
        </Modal.Body>
        <Modal.Footer>

          <input type="text" class="form-control" placeholder="Username" aria-label="Username" aria-describedby="basic-addon1"> </input>
          <Button onClick={mintNFT(mintToAddress)}>Mint NFT</Button>
          
          <Button onClick={props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
  }

  return (
    <div className='container'>
      <div className='top'>
        <div className='title'>WORDL3</div>
        {/* <button className="reset-board" onClick={resetBoard}>{"\u27f3"}</button> */}
        <div className={`clientStatus ${peerConnected ? 'peerConnected' : 'peerDisconnected'}`}>
          Peer connected  
        </div>
      </div>
      {message && <div className='message'>
        {message}
      </div>}
      <div className='cube'>
        {[0, 1, 2, 3, 4, 5].map((row, rowIndex) => (
          <div className={`cube-row ${boardData && row === boardData.rowIndex && error && "error"}`} key={rowIndex}>
            {
              [0, 1, 2, 3, 4].map((column, letterIndex) => (
                <div key={letterIndex} className={`letter ${boardData && boardData.boardRowStatus[row] ? boardData.boardRowStatus[row][column] : ""}`}>
                  {boardData && boardData.boardWords[row] && boardData.boardWords[row][column]}
                </div>
              ))
            }
          </div>
        ))}
      </div>
      <div>
        <MyVerticallyCenteredModal
          show={modalShow}
          onHide={() => setModalShow(false)}
        />
      </div>
      <div className='bottom'>
        <Keyboard boardData={boardData}
          handleKeyPress={handleKeyPress} />
      </div>
    </div>
  );
};

export default App;