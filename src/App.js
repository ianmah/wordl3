import React, { useState, useEffect } from 'react';
import './App.css';
import Keyboard from './components/Keyboard';
import { wordList } from './constants/data';
import { v4 as uuid } from 'uuid';
import { create as IpfsHttpClient } from 'ipfs-http-client'
import { toString as uint8ArrayToString } from "uint8arrays/to-string";

const App = () => {
  const [boardData, setBoardData] = useState(JSON.parse(localStorage.getItem("board-data")));
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(false);
  const [charArray, setCharArray] = useState([]);


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


  useEffect(() => {
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
    let ipfs
    let topic
    let peerId

    console.log("The unique id that was generated: " + small_id)


    async function reset() {
      if (ipfs && topic) {
        console.log(`Unsubscribing from topic ${topic}`)
        await ipfs.pubsub.unsubscribe(topic)
      }

      topic = null
      peerId = null
      ipfs = null
    }

    async function nodeConnect(url) {
      await reset()
      console.log(`Connecting to ${url}`)
      ipfs = IpfsHttpClient(url)
      const { id, agentVersion } = await ipfs.id()
      peerId = id
      console.log(`<span class="green">Success!</span>`)
      console.log(`Version ${agentVersion}`)
      console.log(`Peer ID ${id}`)
      await subscribe('wordl3-topic')
      await send("hello from stan's mac")

    }

    async function subscribe(nextTopic) {
      if (!nextTopic) throw new Error('Missing topic name')
      if (!ipfs) throw new Error('Connect to a node first')

      const lastTopic = topic

      if (topic) {
        topic = null
        console.log(`Unsubscribing from topic ${lastTopic}`)
        await ipfs.pubsub.unsubscribe(lastTopic)
      }

      console.log(`Subscribing to ${nextTopic}...`)

      await ipfs.pubsub.subscribe(nextTopic, msg => {
        const from = msg.from
        const seqno = uint8ArrayToString(msg.seqno, 'base16')
        if (from === peerId) return console.log(`Ignoring message ${seqno} from self`)
        console.log(`Message ${seqno} from ${from}:`)
        try {
          console.log(JSON.stringify(uint8ArrayToString(msg.data), null, 2))
        } catch (_) {
          console.log(uint8ArrayToString(msg.data, 'base16'))
        }
      })

      topic = nextTopic
    }

    async function send(msg) {
      if (!msg) throw new Error('Missing message')
      if (!topic) throw new Error('Subscribe to a topic first')
      if (!ipfs) throw new Error('Connect to a node first')

      console.log(`Sending message to ${topic}...`)
      await ipfs.pubsub.publish(topic, msg)
      console.log(`<span class="green">Success!</span>`)
    }

    nodeConnect('/ip4/127.0.0.1/tcp/5001')


  }, []);

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

  const enterBoardWord = (word) => {
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
        enterBoardWord(word);
        setCharArray([]);
      } else {
        handleMessage("Not enough letters");
      }
      return;
    }
    if (key === "⌫") {
      charArray.splice(charArray.length - 1, 1);
      setCharArray([...charArray]);
    }
    else if (charArray.length < 5) {
      charArray.push(key);
      setCharArray([...charArray]);
    }
    enterCurrentText(charArray.join("").toLowerCase());
  }

  return (
    <div className='container'>
      <div className='top'>
        <div className='title'>WORDLE CLONE</div>
        <button className="reset-board" onClick={resetBoard}>{"\u27f3"}</button>
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
      <div className='bottom'>
        <Keyboard boardData={boardData}
          handleKeyPress={handleKeyPress} />
      </div>
    </div>
  );
};

export default App;
