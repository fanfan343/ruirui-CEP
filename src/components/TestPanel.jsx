import React, { useState, useEffect } from 'react';
import '../styles/TestPanel.css';

// 测试面板组件
function TestPanel() {
  const [result, setResult] = useState('');
  const [csInterface, setCsInterface] = useState(null);
  
  // 初始化CSInterface
  useEffect(() => {
    if (window.CSInterface) {
      setCsInterface(new window.CSInterface());
    }
  }, []);
  
  // 创建文本图层
  const handleCreateTextLayer = () => {
    if (csInterface) {
      csInterface.evalScript('createTextLayer()', (result) => {
        setResult(result);
      });
    } else {
      setResult('CSInterface未初始化，无法执行脚本。');
    }
  };
  
  return (
    <div className="test-panel">
      <h2>AE脚本测试面板</h2>
      
      <div className="button-container">
        <button 
          className="create-text-btn" 
          onClick={handleCreateTextLayer}
        >
          创建文本图层
        </button>
      </div>
      
      {result && (
        <div className="result-container">
          <h3>执行结果:</h3>
          <div className="result-text">{result}</div>
        </div>
      )}
    </div>
  );
}

export default TestPanel; 