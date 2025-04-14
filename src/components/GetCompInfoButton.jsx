import React, { useState, useEffect } from 'react';

// 用于解析SerializeUtils序列化的数据
const parseSerializedData = (jsonString) => {
  try {
    // 添加调试信息，检查输入的字符串
    console.log("原始返回字符串:", jsonString);
    console.log("字符串长度:", jsonString ? jsonString.length : 0);
    console.log("字符串类型:", typeof jsonString);
    
    // 检查字符串是否为空或无效
    if (!jsonString || typeof jsonString !== 'string' || jsonString.trim() === '') {
      console.error("返回的数据为空或无效");
      return null;
    }
    
    // 尝试解析前检查JSON格式
    try {
      // 用正则表达式检查JSON基本格式
      if (!/^\s*[\{\[]/.test(jsonString) || !/[\}\]]\s*$/.test(jsonString)) {
        console.warn("JSON格式可能有问题，不是以{或[开始，或不是以}或]结束");
      }
      
      // 打印前20个和后20个字符，帮助调试
      console.log("JSON开头:", jsonString.substring(0, 20));
      console.log("JSON结尾:", jsonString.substring(jsonString.length - 20));
    } catch (e) {
      console.error("检查JSON格式时出错:", e);
    }
    
    const data = JSON.parse(jsonString);
    console.log("JSON解析成功，解析后的数据:", data);
    
    // 递归处理特殊类型标记
    const reviveSpecialTypes = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      
      // 处理循环引用
      if (obj.__type === 'CircularReference') {
        return '【循环引用】→ ' + obj.path;
      }
      
      // 处理特殊值
      if (obj.__type === 'special') {
        if (obj.value === 'undefined') return '【undefined】';
        if (obj.value === 'NaN') return '【NaN】';
        if (obj.value === 'Infinity') return '【Infinity】';
        if (obj.value === '-Infinity') return '【-Infinity】';
        return obj.value;
      }
      
      // 处理日期
      if (obj.__type === 'Date') {
        return new Date(obj.value);
      }
      
      // 处理数组
      if (Array.isArray(obj)) {
        return obj.map(item => reviveSpecialTypes(item));
      }
      
      // 处理对象
      const result = {};
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          result[key] = reviveSpecialTypes(obj[key]);
        }
      }
      return result;
    };
    
    return reviveSpecialTypes(data);
  } catch (e) {
    console.error("解析序列化数据失败:", e);
    return null;
  }
};

const GetCompInfoButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [compInfo, setCompInfo] = useState(null);
  const [rawResponse, setRawResponse] = useState(null);
  const [isCSILoaded, setIsCSILoaded] = useState(false);

  // 检查CSInterface是否加载
  useEffect(() => {
    const checkCSInterface = () => {
      if (window.CSInterface) {
        console.log("CSInterface已加载");
        setIsCSILoaded(true);
      } else {
        console.warn("CSInterface未加载，尝试重新检查");
        // 5秒后重新检查
        setTimeout(checkCSInterface, 5000);
      }
    };
    
    checkCSInterface();
    
    return () => {
      // 清理任何定时器
    };
  }, []);

  // 简化版获取合成信息函数，不解析复杂JSON
  const getSimpleCompInfo = () => {
    try {
      if (!window.__adobe_cep__) {
        throw new Error("不在Adobe CEP环境中运行");
      }
      
      const csInterface = new window.CSInterface();
      
      // 使用简化版函数，增加获取图层列表功能
      const jsCode = `
        try {
          if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            '没有活动合成';
          } else {
            var comp = app.project.activeItem;
            var result = '合成: ' + comp.name + ', 尺寸: ' + comp.width + 'x' + comp.height + ', 时长: ' + comp.duration + '秒\\n\\n';
            
            // 获取图层列表
            result += '图层列表 (共' + comp.numLayers + '个):\\n';
            
            for (var i = 1; i <= comp.numLayers; i++) {
              try {
                var layer = comp.layer(i);
                var layerType = '';
                
                // 确定图层类型
                if (layer instanceof TextLayer) layerType = "文本";
                else if (layer instanceof ShapeLayer) layerType = "形状";
                else if (layer instanceof CameraLayer) layerType = "摄像机";
                else if (layer instanceof LightLayer) layerType = "灯光";
                else if (layer.source instanceof CompItem) layerType = "预合成";
                else if (layer.nullLayer) layerType = "空对象";
                else if (layer.adjustmentLayer) layerType = "调整层";
                else layerType = "素材";
                
                // 添加到结果
                result += i + '. ' + layer.name + ' [' + layerType + ']';
                result += layer.enabled ? '' : ' (已禁用)';
                result += '\\n';
              } catch(layerErr) {
                result += i + '. [读取错误]\\n';
              }
            }
            
            result;
          }
        } catch(e) {
          '错误: ' + e.toString();
        }
      `;
      
      csInterface.evalScript(jsCode, (response) => {
        setIsLoading(false);
        
        if (!response) {
          console.error("简化版函数无响应");
          setError("无响应，CEP连接可能有问题");
          return;
        }
        
        console.log("简化版函数返回:", response);
        if (response.includes('错误')) {
          setError(response);
        } else {
          setCompInfo({simple: response});
        }
      });
    } catch (err) {
      setIsLoading(false);
      setError("执行失败: " + err.message);
    }
  };

  const getCompInfo = async () => {
    setIsLoading(true);
    setError(null);
    setCompInfo(null);
    setRawResponse(null);
    console.log("开始获取合成信息...");

    // 检查CSInterface是否加载
    if (!window.CSInterface) {
      setIsLoading(false);
      setError("CSInterface未加载，无法与After Effects通信");
      console.error("CSInterface未加载");
      return;
    }

    try {
      // 检查CEP环境
      if (!window.__adobe_cep__) {
        throw new Error("不在Adobe CEP环境中运行");
      }

      // 初始化CSInterface
      const csInterface = new window.CSInterface();
      
      // 先测试简单功能是否正常工作
      csInterface.evalScript('1+1', (testResult) => {
        console.log("基本ExtendScript测试结果:", testResult);
        
        if (testResult !== "2") {
          console.warn("基本ExtendScript测试失败，可能存在通信问题");
        }
        
        // 调用ExtendScript函数获取合成信息
        csInterface.evalScript('getCompInfo()', (response) => {
          setIsLoading(false);
          setRawResponse(response); // 保存原始响应
          
          if (!response) {
            console.error("从ExtendScript返回的响应为空");
            console.log("尝试简化版函数...");
            getSimpleCompInfo();
            return;
          }
          
          if (response && (response.includes('错误') || response.includes('没有活动合成'))) {
            console.error("获取合成信息失败:", response);
            setError(response);
          } else {
            console.log("获取到的合成信息:");
            console.log(response);
            
            // 使用自定义函数解析SerializeUtils处理过的数据
            const parsedData = parseSerializedData(response);
            if (parsedData) {
              console.log("解析后的合成数据:", parsedData);
              setCompInfo(parsedData);
            } else {
              console.warn("无法解析返回数据");
              setError("无法解析返回的数据格式");
            }
          }
        });
      });
    } catch (err) {
      setIsLoading(false);
      setError("获取合成信息失败: " + err.message);
      console.error("获取合成信息出错:", err);
    }
  };

  return (
    <div className="get-compinfo-button-container">
      <button 
        className="get-compinfo-button"
        onClick={getCompInfo}
        disabled={isLoading || !isCSILoaded}
        style={{
          position: 'fixed',
          bottom: '150px',
          right: '40px',
          zIndex: 9999,
          padding: '15px 20px',
          fontSize: '16px',
          backgroundColor: isCSILoaded ? '#1890ff' : '#cccccc',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
        }}
      >
        {isLoading ? '获取中...' : (isCSILoaded ? '获取合成信息' : 'CEP未就绪')}
      </button>
      
      {!isCSILoaded && (
        <div 
          className="error-message" 
          style={{
            position: 'fixed',
            bottom: '210px',
            right: '40px',
            zIndex: 9999,
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 193, 7, 0.9)',
            color: 'black',
            borderRadius: '5px',
            fontSize: '13px',
            maxWidth: '250px'
          }}
        >
          CSInterface未加载，等待连接After Effects...
        </div>
      )}
      
      {compInfo && (
        <div 
          className="success-message" 
          style={{
            position: 'fixed',
            bottom: '210px',
            right: '40px',
            zIndex: 9999,
            padding: '12px 15px',
            backgroundColor: 'rgba(40, 167, 69, 0.9)',
            color: 'white',
            borderRadius: '5px',
            fontSize: '13px',
            maxWidth: '350px',
            maxHeight: '70vh',
            overflowY: 'auto',
            whiteSpace: 'pre-line',
            lineHeight: '1.4',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
          }}
        >
          {compInfo.simple ? compInfo.simple : "成功获取合成信息，请查看控制台"}
        </div>
      )}
      
      {rawResponse && !compInfo && !error && (
        <div 
          className="warning-message" 
          style={{
            position: 'fixed',
            bottom: '240px',
            right: '40px',
            zIndex: 9999,
            padding: '8px 12px',
            backgroundColor: 'rgba(255, 193, 7, 0.9)',
            color: 'black',
            borderRadius: '5px',
            fontSize: '13px',
            maxWidth: '250px'
          }}
        >
          收到响应但无法解析，请查看控制台
        </div>
      )}
      
      {error && (
        <div 
          className="error-message" 
          style={{
            position: 'fixed',
            bottom: '210px',
            right: '40px',
            zIndex: 9999,
            padding: '8px 12px',
            backgroundColor: 'rgba(220, 53, 69, 0.9)',
            color: 'white',
            borderRadius: '5px',
            fontSize: '13px',
            maxWidth: '250px'
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
};

export default GetCompInfoButton; 