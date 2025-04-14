// 首先引入JSON支持和工具库
//@include "lib/json2.jsx"
//@include "lib/jsonUtils.jsx"

// 与Adobe应用程序通信的JSX脚本
function sayHello() {
    return "Hello from JSX!";
}

// 获取当前项目信息
function getProjectInfo() {
    if (app.project) {
        return {
            name: app.project.file ? app.project.file.name : "未保存项目",
            items: app.project.numItems
        };
    }
    return { name: "无项目", items: 0 };
}

// 获取当前合成详细信息
function getCompInfo() {
    try {
        if (!(app.project.activeItem instanceof CompItem)) {
            return JSON.stringify({ error: "没有活动合成" });
        }
        
        var comp = app.project.activeItem;
        // 使用createSafeAEObject创建安全对象
        var safeCompInfo = {
            name: String(comp.name),
            width: Number(comp.width),
            height: Number(comp.height),
            duration: Number(comp.duration),
            frameRate: Number(comp.frameRate),
            numLayers: Number(comp.numLayers),
            layers: []
        };
        
        // 手动构建图层信息数组
        for (var i = 1; i <= comp.numLayers; i++) {
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
                
                safeCompInfo.layers.push({
                    name: String(layer.name),
                    index: Number(i),
                    type: layerType,
                    enabled: Boolean(layer.enabled),
                    inPoint: Number(layer.inPoint),
                    outPoint: Number(layer.outPoint)
                });
            } catch (layerErr) {
                safeCompInfo.layers.push({
                    name: "图层 #" + i + " (读取错误)",
                    error: String(layerErr)
                });
            }
        }
        
        // 使用safeStringify安全序列化
        return safeStringify(safeCompInfo);
    } catch (err) {
        return JSON.stringify({
            error: "获取合成信息错误: " + err.toString()
        });
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
        
        return "已创建文本图层: " + textLayer.name;
    } catch (e) {
        alert("创建文本图层出错: " + e.toString());
        return "创建文本图层出错: " + e.toString();
    }
}

// 测试循环引用的JSON序列化
function testCircularJSON() {
    try {
        // 创建一个带有循环引用的对象
        var obj = {
            name: "测试对象",
            value: 123,
            child: {
                name: "子对象",
                value: 456
            }
        };
        
        // 添加循环引用
        obj.self = obj;
        obj.child.parent = obj;
        
        // 常规JSON.stringify会失败
        var normalResult;
        try {
            normalResult = JSON.stringify(obj);
        } catch (e) {
            normalResult = "常规JSON.stringify错误: " + e.toString();
        }
        
        // 使用安全的stringify
        var safeResult = safeStringify(obj);
        
        // 返回结果比较
        return JSON.stringify({
            description: "循环引用JSON序列化测试",
            normalResult: normalResult,
            safeResult: safeResult
        });
    } catch (e) {
        return "测试循环引用序列化出错: " + e.toString();
    }
} 