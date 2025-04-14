import React, { useState, useRef, useEffect } from 'react';
import ruiruiAvatar from '/icons/ruirui.png';

const ChatInterface = ({ isActive = true, messages: propMessages = [], updateMessages, sessionId }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      text: '你好呀！我是ruirui！', 
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // 初始化消息或同步props消息
  useEffect(() => {
    if (propMessages && propMessages.length > 0) {
      setMessages(propMessages);
    } else if (messages.length === 1 && messages[0].id === 1) {
      // 如果是默认初始消息，同步到父组件
      updateMessages && updateMessages(messages);
    }
  }, [propMessages, sessionId]);

  // 当消息更新时，通知父组件
  useEffect(() => {
    if (updateMessages && messages.length > 0) {
      updateMessages(messages);
    }
  }, [messages]);

  // 自动滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current && messages.length > 0) {
      // 只有在消息增加时才滚动
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && !lastMessage.isScrolled) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto' });
        // 标记这条消息已经滚动过
        if (lastMessage) {
          lastMessage.isScrolled = true;
        }
      }
    }
  }, [messages]);

  // 当标签激活时，聚焦输入框
  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus();
    }
  }, [isActive]);

  // 解析DeepSeek R1的思维链
  const parseR1Response = (text) => {
    // 检查是否是R1模型的响应格式（包含<think>标签）
    if (text && text.includes("<think>") && text.includes("</think>")) {
      // 提取思维链和最终答案
      const thinkMatch = text.match(/<think>([\s\S]*?)<\/think>/);
      const thinking = thinkMatch ? thinkMatch[1].trim() : '';
      
      // 提取最终答案（思维链之后的部分）
      let answer = text.replace(/<think>[\s\S]*?<\/think>/, '').trim();
      
      return {
        thinking,
        answer
      };
    }
    
    // 不是R1格式，直接返回原文本
    return {
      thinking: '',
      answer: text || ''
    };
  };

  const sendToDeepSeek = async (userMessage) => {
    // 获取保存的设置
    const apiKey = localStorage.getItem('deepseek_api_key');
    const model = localStorage.getItem('deepseek_model') || 'deepseek-chat';
    const baseUrl = localStorage.getItem('deepseek_base_url') || 'https://api.deepseek.com';
    
    if (!apiKey) {
      return '请先在设置中配置DeepSeek API Key';
    }
    
    try {
      setIsLoading(true);
      
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
              // 过滤掉欢迎消息、加载消息和思维链消息
              const filteredMessages = messages.filter(msg => 
                !(msg.id === 1 && !msg.isUser) && 
                !msg.isLoading && 
                !msg.isThinking // 过滤掉思维链消息
              );
              
              // 构建消息序列
              return filteredMessages.map(msg => ({
                role: msg.isUser ? "user" : "assistant",
                content: msg.text
              }));
            })(),
            {role: "user", content: userMessage}
          ],
          stream: false
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || '请求失败');
      }
      
      // 处理reasoning_content字段
      const content = data.choices[0].message.content || '';
      const reasoningContent = data.choices[0].message.reasoning_content || '';
      
      return {
        content: content,
        reasoningContent: reasoningContent
      };
    } catch (error) {
      console.error('API调用错误:', error);
      return {
        content: `调用DeepSeek API出错: ${error.message}`,
        reasoningContent: ''
      };
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (input.trim() === '' || isLoading) return;
    
    // 添加用户消息
    const userInput = input.trim();
    const newUserMessage = {
      id: messages.length + 1,
      text: userInput,
      isUser: true
    };
    
    setMessages([...messages, newUserMessage]);
    setInput('');
    
    // 调用DeepSeek API
    const apiKey = localStorage.getItem('deepseek_api_key');
    if (apiKey) {
      // 添加正在输入状态
      const loadingMessage = {
        id: messages.length + 2,
        text: '正在思考...',
        isUser: false,
        isLoading: true
      };
      setMessages(prevMessages => [...prevMessages, loadingMessage]);
      
      // 获取API响应
      const response = await sendToDeepSeek(userInput);
      
      // 处理API响应
      let reply = response.content || '';
      let reasoning = response.reasoningContent || '';
      
      // 如果没有reasoningContent，尝试解析<think>标签
      if (!reasoning && reply.includes("<think>")) {
        const parseResult = parseR1Response(reply);
        if (parseResult.thinking) {
          reasoning = parseResult.thinking;
          reply = parseResult.answer;
        }
      }
      
      // 更新回复
      setMessages(prevMessages => {
        // 移除加载消息
        const filtered = prevMessages.filter(msg => !msg.isLoading);
        
        let newMessages = filtered;
        
        // 如果有思维链，添加思维链和回复消息
        if (reasoning) {
          newMessages = [...filtered, 
            // 添加思维链消息
            {
              id: filtered.length + 1,
              text: reasoning,
              isUser: false,
              isThinking: true // 标记为思维链，确保下一轮对话中被过滤
            }, 
            // 添加最终回复
            {
              id: filtered.length + 2,
              text: reply,
              isUser: false
            }
          ];
        } else {
          // 没有思维链，只添加回复
          newMessages = [...filtered, {
            id: filtered.length + 1,
            text: reply,
            isUser: false
          }];
        }
        
        return newMessages;
      });
    } else {
      // 如果没有API Key，显示提示消息
      setTimeout(() => {
        const botReply = {
          id: messages.length + 2,
          text: '请先在设置中配置DeepSeek API Key，以便连接到真实的AI服务。',
          isUser: false
        };
        setMessages(prevMessages => [...prevMessages, botReply]);
      }, 500);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAvatarClick = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  // 如果该标签不是激活状态，可以不渲染内容
  if (!isActive) {
    return null;
  }

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className={`message ${message.isUser ? 'user-message' : 'bot-message'} ${message.isThinking ? 'thinking-message' : ''}`}>
            {!message.isUser && (
              <img 
                src={ruiruiAvatar} 
                alt="ruirui" 
                className={`message-avatar ${isShaking ? 'avatar-shake' : ''}`}
                onClick={handleAvatarClick}
              />
            )}
            <div className={`message-content ${message.isThinking ? 'thinking-content' : ''}`}>
              {message.isLoading ? '思考中...' : message.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} style={{ float: 'left', clear: 'both' }} />
      </div>
    </div>
  );
};

export default ChatInterface; 