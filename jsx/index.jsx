// 与Adobe应用程序通信的JSX脚本
// 引入JSON处理库和工具库
//@include "./lib/json2.jsx"
//@include "./lib/AEUtils.jsx"
//@include "./lib/serializeUtils.jsx"

function sayHello() {
    return "Hello from JSX!";
}

// 安全序列化工具函数
function safeSerialize(obj, space) {
    try {
        // 测试obj是否可序列化
        if (obj === undefined) return JSON.stringify({__type: "special", value: "undefined"});
        if (obj === null) return JSON.stringify(null);
    
        // 优先使用SerializeUtils
        if (typeof SerializeUtils !== "undefined" && SerializeUtils.stringify) {
            var result = SerializeUtils.stringify(obj, space);
            return result;
        }
        
        // 其次使用AEUtils
        if (typeof AEUtils !== "undefined" && AEUtils.safeStringify) {
            var result = AEUtils.safeStringify(obj, null, space);
            return result;
        }
        
        // 再次使用JSON.safeStringify
        if (typeof JSON !== "undefined" && JSON.safeStringify) {
            var result = JSON.safeStringify(obj, null, space);
            return result;
        }
        
        // 最后使用标准JSON.stringify
        var result = JSON.stringify(obj, null, space);
        return result;
    } catch (e) {
        var errorMsg = "序列化错误: " + e.toString();
        alert("序列化数据时出错: " + e.toString());
        return JSON.stringify({ error: errorMsg });
    }
}

// 获取当前项目信息
function getProjectInfo() {
    // 使用AEUtils安全获取项目信息
    if (typeof AEUtils !== "undefined" && AEUtils.getProjectInfo) {
        // 使用安全序列化
        return safeSerialize(AEUtils.getProjectInfo(), 2);
    }
    
    // 后备方案：简单信息
    if (app.project) {
        return safeSerialize({
            name: app.project.file ? app.project.file.name : "未保存项目",
            items: app.project.numItems
        }, 2);
    }
    return safeSerialize({ name: "无项目", items: 0 }, 2);
}

// 获取当前合成详细信息
function getCompInfo() {
    try {
        // 检查After Effects是否运行
        if (typeof app === "undefined" || !app.project) {
            return safeSerialize({ error: "After Effects项目未打开" });
        }
        
        // 检查是否有活动合成
        if (!(app.project.activeItem instanceof CompItem)) {
            return safeSerialize({ error: "没有活动合成" });
        }
        
        // 调试信息
        alert("开始获取合成信息");
        
        var compInfo = {};
        
        // 使用AEUtils安全获取合成信息
        if (typeof AEUtils !== "undefined" && AEUtils.getCompInfo) {
            compInfo = AEUtils.getCompInfo(app.project.activeItem);
            // 添加简单的调试信息
            alert("已使用AEUtils获取数据");
        } else {
            // 后备方案：手动构建基本信息
            var comp = app.project.activeItem;
            compInfo = {
                name: String(comp.name),
                width: Number(comp.width),
                height: Number(comp.height),
                duration: Number(comp.duration),
                frameRate: Number(comp.frameRate),
                numLayers: Number(comp.numLayers),
                layers: []
            };
            
            // 简化的图层信息数组，减少数据量
            for (var i = 1; i <= Math.min(comp.numLayers, 10); i++) {
                try {
                    var layer = comp.layer(i);
                    var layerType = "";
                    
                    // 安全地确定图层类型
                    if (layer instanceof TextLayer) layerType = "文本";
                    else if (layer instanceof ShapeLayer) layerType = "形状";
                    else if (layer instanceof CameraLayer) layerType = "摄像机";
                    else if (layer instanceof LightLayer) layerType = "灯光";
                    else if (layer.source instanceof CompItem) layerType = "预合成";
                    else if (layer.nullLayer) layerType = "空对象";
                    else if (layer.adjustmentLayer) layerType = "调整层";
                    else layerType = "素材";
                    
                    compInfo.layers.push({
                        name: String(layer.name),
                        index: Number(i),
                        type: layerType
                    });
                } catch (layerErr) {
                    compInfo.layers.push({
                        name: "图层 #" + i + " (读取错误)",
                        error: String(layerErr)
                    });
                }
            }
            
            if (comp.numLayers > 10) {
                compInfo.layers.push({
                    name: "...(更多图层)",
                    note: "仅显示前10个图层"
                });
            }
            
            // 添加简单的调试信息
            alert("已手动构建合成数据");
        }
        
        // 测试简单序列化
        var testObj = {test: "测试数据", num: 123};
        var testJson = JSON.stringify(testObj);
        alert("测试JSON序列化: " + testJson);
        
        // 安全序列化合成信息
        var serialized = safeSerialize(compInfo, 2);
        alert("序列化完成，数据长度: " + serialized.length);
        
        return serialized;
    } catch (err) {
        alert("获取合成信息错误: " + err.toString());
        return safeSerialize({ error: "获取合成信息错误: " + err.toString() });
    }
}

// 创建测试文本图层
function createTextLayer() {
    try {
        // 确保有活动的合成
        if (!app.project.activeItem || !(app.project.activeItem instanceof CompItem)) {
            // 如果没有活动合成，创建一个新的合成
            var newComp = app.project.items.addComp("测试合成", 1920, 1080, 1, 10, 30);
            newComp.openInViewer();
        }
        
        // 创建文本图层
        var textLayer = app.project.activeItem.layers.addText("测试文本图层 - " + new Date().toLocaleTimeString());
        
        // 设置一些基本属性
        var textProp = textLayer.property("Source Text").value;
        textProp.fontSize = 72;
        textProp.fillColor = [1, 1, 1]; // 白色
        textLayer.property("Source Text").setValue(textProp);
        
        // 定位在中心
        textLayer.position.setValue([app.project.activeItem.width/2, app.project.activeItem.height/2]);
        
        // 添加简单确认弹窗
        alert("已成功创建文本图层！");
        
        return safeSerialize({
            success: true,
            message: "已创建文本图层: " + textLayer.name
        });
    } catch (e) {
        alert("创建文本图层出错: " + e.toString());
        return safeSerialize({
            success: false,
            error: "创建文本图层出错: " + e.toString()
        });
    }
} 