import React, { useState } from 'react'
import CryptoJS from 'crypto-js'
import './App.css'

const GAMEID = 123456

const createWord = (word) => {
  if (word.length > 5) {
    return
  }

  const hashes = word.split('').map((letter, i) => {
    return CryptoJS.SHA256(letter + i + GAMEID).toString(CryptoJS.enc.Base64);
  })

  console.log(hashes)

}

function App() {
  const [word, setWord] = useState('crane')
  
  createWord('crane')

  return (
    <div className="App">
      <header className="App-header">
        <div>
        {[0,1,2,3,4].map((i) => {
          return <div className="letter-box" key={i}>{word[i]}</div>
        })
      }
      </div>
        <p>
          Edit <code>src/App.js</code> and save to reload.
        </p>
        <a
          className="App-link"
          href="https://reactjs.org"
          target="_blank"
          rel="noopener noreferrer"
        >
          Learn React
        </a>
      </header>
    </div>
  );
}

export default App;
