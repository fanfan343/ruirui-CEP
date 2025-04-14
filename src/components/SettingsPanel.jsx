import React, { useState, useEffect, useRef } from 'react';

const SettingsPanel = ({ isVisible, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('deepseek-chat');
  const [baseUrl, setBaseUrl] = useState('https://api.deepseek.com');
  const panelRef = useRef(null);
  
  // 从localStorage加载设置
  useEffect(() => {
    if (isVisible) {
      const savedApiKey = localStorage.getItem('deepseek_api_key') || '';
      const savedModel = localStorage.getItem('deepseek_model') || 'deepseek-chat';
      const savedBaseUrl = localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com';
      
      setApiKey(savedApiKey);
      setModel(savedModel);
      setBaseUrl(savedBaseUrl);
    }
  }, [isVisible]);
  
  // 添加点击事件监听器，处理点击外部区域自动保存
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target) && isVisible) {
        handleSave();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, apiKey, model, baseUrl]);
  
  const handleSave = () => {
    // 保存设置到localStorage
    localStorage.setItem('deepseek_api_key', apiKey);
    localStorage.setItem('deepseek_model', model);
    localStorage.setItem('deepseek_base_url', baseUrl);
    
    // 关闭设置面板
    onClose();
  };
  
  // 如果设置面板不可见，则不渲染
  if (!isVisible) return null;
  
  return (
    <div className="settings-panel" ref={panelRef}>
      <h3>ruirui的声带</h3>
      
      <div className="settings-group">
        <label htmlFor="apiKey">DeepSeek API Key</label>
        <input
          id="apiKey"
          type="password"
          className="settings-input"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入您的DeepSeek API Key"
        />
      </div>
      
      <div className="settings-group">
        <label htmlFor="baseUrl">API 端点</label>
        <input
          id="baseUrl"
          type="text"
          className="settings-input"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="API端点地址"
        />
      </div>
      
      <div className="settings-group">
        <label htmlFor="model">DeepSeek 模型</label>
        <select
          id="model"
          className="settings-select"
          value={model}
          onChange={(e) => setModel(e.target.value)}
        >
          <option value="deepseek-chat">DeepSeek-V3 (deepseek-chat)</option>
          <option value="deepseek-reasoner">DeepSeek-R1 (deepseek-reasoner)</option>
        </select>
      </div>
      
      <button className="save-settings" onClick={handleSave}>
        保存设置
      </button>
    </div>
  );
};

export default SettingsPanel; 