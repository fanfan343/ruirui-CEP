import React, { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="App">
      <header>
        <h1>RuiRui CEP 面板</h1>
      </header>
      <main>
        <div className="card">
          <button onClick={() => setCount((count) => count + 1)}>
            点击次数: {count}
          </button>
          <p>
            使用 Vite + React 构建的 CEP 面板，支持热重载开发
          </p>
        </div>
      </main>
    </div>
  )
}

export default App 