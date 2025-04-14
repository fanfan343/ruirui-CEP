import React, { useState, useEffect } from 'react'
import './App.css'
import ChatTabs from './components/ChatTabs'
import SettingsPanel from './components/SettingsPanel'
import TestPanel from './components/TestPanel'

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(false);
  
  const toggleSettings = () => {
    setShowSettings(!showSettings);
    if (showTestPanel) setShowTestPanel(false);
  };
  
  const toggleTestPanel = () => {
    setShowTestPanel(!showTestPanel);
    if (showSettings) setShowSettings(false);
  };

  // 检查API配置状态
  useEffect(() => {
    const checkApiConfiguration = () => {
      const apiKey = localStorage.getItem('deepseek_api_key');
      setApiConfigured(!!apiKey && apiKey.trim() !== '');
    };

    // 初始检查
    checkApiConfiguration();
    
    // 当设置面板关闭时再次检查
    if (!showSettings) {
      checkApiConfiguration();
    }
  }, [showSettings]);

  return (
    <div className="App">
      {/* 顶部按钮栏 */}
      <div className="top-buttons">
        <button 
          className={`test-button ${showTestPanel ? 'active' : ''}`} 
          onClick={toggleTestPanel}
        >
          测试
        </button>
      </div>
      
      {/* 测试面板 */}
      {showTestPanel ? (
        <TestPanel />
      ) : (
        <>
          {/* 聊天标签页界面 */}
          <ChatTabs 
            toggleSettings={toggleSettings} 
            apiConfigured={apiConfigured}
            setApiConfigured={setApiConfigured}
          />
          
          {/* 设置面板 */}
          <SettingsPanel 
            isVisible={showSettings} 
            onClose={() => setShowSettings(false)} 
          />
        </>
      )}
    </div>
  )
}

export default App 