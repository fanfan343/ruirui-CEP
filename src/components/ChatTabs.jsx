import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './ChatInterface';
import { v4 as uuidv4 } from 'uuid';
import addIcon from '/icons/Add_Plus_Circle.svg';
import heartIcon from '/icons/Heart_01.svg';
import settingsIcon from '/icons/Settings_Future.svg';
import playIcon from '/icons/Play.svg';
import terminalIcon from '/icons/Window_Terminal.svg';
import sendIcon from '/icons/Send.svg';
import '../styles/ChatTabs.css';

const ChatTabs = ({ toggleSettings, apiConfigured, setApiConfigured }) => {
  const [tabs, setTabs] = useState([
    { id: uuidv4(), title: '新对话', messages: [] }
  ]);
  const [activeTabId, setActiveTabId] = useState(tabs[0].id);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef(null);
  
  // 从本地存储加载会话
  useEffect(() => {
    const savedTabs = localStorage.getItem('chatTabs');
    if (savedTabs) {
      try {
        const parsedTabs = JSON.parse(savedTabs);
        if (Array.isArray(parsedTabs) && parsedTabs.length > 0) {
          setTabs(parsedTabs);
          setActiveTabId(parsedTabs[0].id);
        }
      } catch (error) {
        console.error('加载会话失败:', error);
      }
    }
  }, []);
  
  // 保存会话到本地存储
  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem('chatTabs', JSON.stringify(tabs));
    }
  }, [tabs]);
  
  // 切换当前活动的标签页
  const switchTab = (tabId) => {
    setActiveTabId(tabId);
  };
  
  // 添加新的标签页
  const addNewTab = () => {
    const newTab = {
      id: uuidv4(),
      title: '新对话',
      messages: []
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTab.id);
  };
  
  // 关闭标签页
  const closeTab = (tabId, event) => {
    event.stopPropagation(); // 防止触发标签切换
    
    if (tabs.length === 1) {
      // 如果只有一个标签，则创建一个新标签后再关闭
      const newTab = {
        id: uuidv4(),
        title: '新对话',
        messages: []
      };
      setTabs([newTab]);
      setActiveTabId(newTab.id);
    } else {
      // 找出要关闭的标签的索引
      const tabIndex = tabs.findIndex(tab => tab.id === tabId);
      
      // 如果关闭的是当前活动标签，则需要激活另一个标签
      if (tabId === activeTabId) {
        // 如果关闭的是最后一个标签，则激活前一个
        // 否则激活下一个标签
        const newActiveIndex = tabIndex === tabs.length - 1 ? tabIndex - 1 : tabIndex + 1;
        setActiveTabId(tabs[newActiveIndex].id);
      }
      
      // 移除标签
      setTabs(tabs.filter(tab => tab.id !== tabId));
    }
  };
  
  // 更新标签标题（基于第一条用户消息）
  const updateTabTitle = (tabId, messages) => {
    if (messages.length > 0) {
      // 找到第一条用户消息作为标题
      const userMessage = messages.find(msg => msg.isUser);
      if (userMessage) {
        // 截断标题，保持在15个字符以内
        const title = userMessage.text.length > 15 
          ? userMessage.text.substring(0, 15) + '...' 
          : userMessage.text;
          
        setTabs(prevTabs => 
          prevTabs.map(tab => 
            tab.id === tabId ? { ...tab, title } : tab
          )
        );
      }
    }
  };
  
  // 更新消息
  const updateMessages = (tabId, newMessages) => {
    setTabs(prevTabs => 
      prevTabs.map(tab => 
        tab.id === tabId ? { ...tab, messages: newMessages } : tab
      )
    );
    
    // 检查是否需要更新标题
    const tab = tabs.find(t => t.id === tabId);
    if (tab && (!tab.title || tab.title === '新对话')) {
      updateTabTitle(tabId, newMessages);
    }
  };
  
  // 处理发送消息
  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    
    // 添加用户消息
    const userInput = input.trim();
    
    // 找到当前活动标签
    const activeTab = tabs.find(tab => tab.id === activeTabId);
    if (!activeTab) return;
    
    // 创建用户消息
    const newUserMessage = {
      id: (activeTab.messages.length || 0) + 1,
      text: userInput,
      isUser: true
    };
    
    // 更新消息列表
    const updatedMessages = [...activeTab.messages, newUserMessage];
    updateMessages(activeTabId, updatedMessages);
    
    // 清空输入框
    setInput('');
    
    // 调用DeepSeek API
    const apiKey = localStorage.getItem('deepseek_api_key');
    if (apiKey) {
      // 添加正在输入状态
      const loadingMessage = {
        id: updatedMessages.length + 1,
        text: '正在思考...',
        isUser: false,
        isLoading: true
      };
      updateMessages(activeTabId, [...updatedMessages, loadingMessage]);
      
      // 设置加载状态
      setIsLoading(true);
      
      try {
        // 获取设置
        const model = localStorage.getItem('deepseek_model') || 'deepseek-chat';
        const baseUrl = localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com';
        
        // 发送API请求
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: [
              {role: "system", content: "你是一个有用的助手，名叫ruirui。你正在Adobe After Effects的CEP面板中与用户对话。尽量简短回答用户的问题。"},
              // 构建对话历史 - 严格遵循DeepSeek文档示例
              ...(() => {
                // 过滤掉欢迎消息、加载消息和思维链消息（重要！不能包含思维链）
                const filteredMessages = updatedMessages.filter(msg => 
                  !(msg.id === 1 && !msg.isUser) && 
                  !msg.isLoading && 
                  !msg.isThinking // 过滤掉思维链消息
                );
                
                // 构建消息序列
                return filteredMessages.map(msg => ({
                  role: msg.isUser ? "user" : "assistant",
                  content: msg.text
                }));
              })()
            ],
            stream: false
          })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error?.message || '请求失败');
        }
        
        // API调用成功，将apiConfigured设置为true
        if (!apiConfigured) {
          setApiConfigured(true);
        }
        
        // 解析回复，正确处理reasoning_content字段
        let reply = data.choices[0].message.content || '';
        let reasoning = data.choices[0].message.reasoning_content || '';
        
        // 注意：优先使用API返回的reasoning_content字段
        // 如果没有该字段，才尝试解析<think>标签
        if (!reasoning) {
          // 尝试解析<think>标签
          const parseR1Response = (text) => {
            if (text.includes("<think>") && text.includes("</think>")) {
              const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
              const thinking = thinkMatch ? thinkMatch[1].trim() : '';
              let answer = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
              return { thinking, answer };
            }
            return { thinking: '', answer: text };
          };
          const parseResult = parseR1Response(reply);
          if (parseResult.thinking) {
            reasoning = parseResult.thinking;
            reply = parseResult.answer;
          }
        }
        
        // 更新消息列表
        const filteredMessages = updatedMessages.filter(msg => !msg.isLoading);
        
        let newMessages = filteredMessages;
        
        // 如果有思维链，添加思维链和回复消息
        if (reasoning) {
          newMessages = [...filteredMessages, 
            // 添加思维链消息
            {
              id: filteredMessages.length + 1,
              text: reasoning,
              isUser: false,
              isThinking: true // 标记为思维链，确保下一轮对话中被过滤
            }, 
            // 添加最终回复
            {
              id: filteredMessages.length + 2,
              text: reply,
              isUser: false
            }
          ];
        } else {
          // 没有思维链，只添加回复
          newMessages = [...filteredMessages, {
            id: filteredMessages.length + 1,
            text: reply,
            isUser: false
          }];
        }
        
        updateMessages(activeTabId, newMessages);
      } catch (error) {
        console.error('API调用错误:', error);
        // 移除加载消息
        const filteredMessages = updatedMessages.filter(msg => !msg.isLoading);
        // 添加错误消息
        updateMessages(activeTabId, [...filteredMessages, {
          id: filteredMessages.length + 1,
          text: `调用DeepSeek API出错: ${error.message}`,
          isUser: false
        }]);
        
        // 如果API调用失败，可能是配置有问题
        setApiConfigured(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      // 如果没有API Key，显示提示消息
      setTimeout(() => {
        const botReply = {
          id: updatedMessages.length + 1,
          text: '请先在设置中配置DeepSeek API Key，以便连接到真实的AI服务。',
          isUser: false
        };
        updateMessages(activeTabId, [...updatedMessages, botReply]);
      }, 500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };
  
  // 当活动标签切换时，聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeTabId]);
  
  return (
    <div className="chat-tabs-container">
      <div className="tabs-header">
        <div className="tabs-list">
          {tabs.map(tab => (
            <div 
              key={tab.id}
              className={`tab ${activeTabId === tab.id ? 'active' : ''}`}
              onClick={() => switchTab(tab.id)}
            >
              <span className="tab-title">{tab.title || '新对话'}</span>
              <button 
                className="close-tab-btn"
                onClick={(e) => closeTab(tab.id, e)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button className="add-tab-btn" onClick={addNewTab} title="新建对话">
          <img src={addIcon} alt="添加" className="add-tab-icon" />
        </button>
      </div>
      
      <div className="tabs-content">
        {tabs.map(tab => (
          <ChatInterface
            key={tab.id}
            isActive={activeTabId === tab.id}
            messages={tab.messages}
            updateMessages={(messages) => {
              // 避免不必要的更新
              const currentMessages = tabs.find(t => t.id === tab.id)?.messages || [];
              if (JSON.stringify(currentMessages) !== JSON.stringify(messages)) {
                updateMessages(tab.id, messages);
              }
            }}
            sessionId={tab.id}
          />
        ))}
      </div>
      
      {/* 统一的底部区域 */}
      <div className="bottom-area">
        {/* 输入框部分 */}
        <div className="bottom-controls">
          <div className="chat-input-container">
            <textarea
              ref={inputRef}
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息..."
              rows={1}
              disabled={isLoading}
            />
            <button 
              className="send-button" 
              onClick={handleSend}
              disabled={isLoading || input.trim() === ''}
              title="发送"
            >
              {isLoading ? 
                <span className="loading-dots">...</span> : 
                <img src={sendIcon} alt="发送" className="send-icon" />
              }
            </button>
          </div>
        </div>
        
        {/* 左下角的爱心图标 */}
        <div className="icon-group left-icons">
          <img 
            src={heartIcon} 
            alt="喜欢" 
            className={`icon ${apiConfigured ? 'icon-success' : ''}`} 
            title={apiConfigured ? "API已配置" : "API未配置"} 
          />
          <img src={heartIcon} alt="喜欢" className="icon" title="喜欢" />
          <img src={heartIcon} alt="喜欢" className="icon" title="喜欢" />
        </div>
        
        {/* 右下角的其他图标，设置图标放在最右边 */}
        <div className="icon-group right-icons">
          <img src={playIcon} alt="播放" className="icon" title="播放" />
          <img src={terminalIcon} alt="终端" className="icon" title="终端" />
          <img 
            src={settingsIcon} 
            alt="设置" 
            className="icon" 
            title="设置" 
            onClick={toggleSettings}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatTabs; 