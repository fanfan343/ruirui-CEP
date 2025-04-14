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
        
        return "已创建文本图层: " + textLayer.name;
    } catch (e) {
        return "创建文本图层出错: " + e.toString();
    }
} 