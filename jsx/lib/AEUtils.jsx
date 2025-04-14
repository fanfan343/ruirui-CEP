// AEUtils.jsx
// After Effects ExtendScript实用工具集
// 依赖json2.jsx

// 确保已加载json2.jsx
if (typeof JSON === "undefined" || typeof JSON.safeStringify !== "function") {
    try {
        var libFolder = new File($.fileName).parent;
        $.evalFile(new File(libFolder.absoluteURI + "/json2.jsx"));
    } catch (e) {
        alert("无法加载json2.jsx: " + e.toString());
    }
}

// 工具命名空间
var AEUtils = {};

/**
 * 安全地序列化After Effects对象
 * 处理循环引用和复杂对象
 * 
 * @param {Object} obj 要序列化的对象
 * @param {Array|Function} [replacer] 可选的替换函数或属性数组
 * @param {Number|String} [space] 缩进空格数或字符串
 * @returns {String} JSON字符串
 */
AEUtils.safeStringify = function(obj, replacer, space) {
    // 如果JSON.safeStringify可用，则使用它
    if (typeof JSON.safeStringify === "function") {
        return JSON.safeStringify(obj, replacer, space);
    }
    
    // 否则使用自定义的安全序列化
    var cache = [];
    try {
        var result = JSON.stringify(obj, function(key, value) {
            // 优先调用用户提供的replacer
            if (replacer && typeof replacer === 'function') {
                value = replacer(key, value);
            }
            
            // 处理After Effects特定对象类型
            if (value && typeof value === 'object') {
                // 检测循环引用
                if (cache.indexOf(value) !== -1) {
                    return "[Circular]";
                }
                
                // 添加到缓存以检测循环
                cache.push(value);
                
                // 处理After Effects特定类型
                if (value instanceof CompItem) {
                    return {
                        _type: "CompItem",
                        name: value.name,
                        id: value.id,
                        width: value.width,
                        height: value.height
                    };
                } else if (value instanceof FootageItem) {
                    return {
                        _type: "FootageItem",
                        name: value.name,
                        id: value.id
                    };
                } else if (value instanceof Layer) {
                    return {
                        _type: "Layer",
                        name: value.name,
                        index: value.index
                    };
                }
            }
            
            return value;
        }, space);
        
        return result;
    } catch (e) {
        return JSON.stringify({ error: "序列化错误: " + e.toString() });
    } finally {
        cache = null; // 释放内存
    }
};

/**
 * 将After Effects对象转换为安全的纯JavaScript对象，
 * 允许选择特定的属性进行保留
 * 
 * @param {Object} aeObject After Effects对象
 * @param {Array} [propertiesToKeep] 要保留的属性数组
 * @returns {Object} 安全的纯JavaScript对象
 */
AEUtils.toPlainObject = function(aeObject, propertiesToKeep) {
    if (!aeObject || typeof aeObject !== 'object') {
        return aeObject;
    }
    
    var result = {};
    
    // 如果提供了要保留的属性列表
    if (Array.isArray(propertiesToKeep)) {
        for (var i = 0; i < propertiesToKeep.length; i++) {
            var prop = propertiesToKeep[i];
            try {
                if (aeObject[prop] !== undefined) {
                    // 安全地获取属性值
                    var value = aeObject[prop];
                    
                    // 处理不同类型
                    if (value === null) {
                        result[prop] = null;
                    } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
                        result[prop] = value;
                    } else if (value instanceof Array) {
                        // 处理数组
                        result[prop] = [];
                        for (var j = 0; j < value.length; j++) {
                            result[prop].push(AEUtils.toPlainObject(value[j]));
                        }
                    } else if (typeof value === 'object') {
                        // 递归处理对象
                        result[prop] = AEUtils.toPlainObject(value);
                    } else {
                        // 其他类型（如函数）转为字符串表示
                        result[prop] = String(value);
                    }
                }
            } catch (e) {
                result[prop + "_error"] = String(e);
            }
        }
    } else {
        // 如果没有提供属性列表，尝试复制所有可枚举属性
        try {
            for (var key in aeObject) {
                if (aeObject.hasOwnProperty && aeObject.hasOwnProperty(key)) {
                    try {
                        var objValue = aeObject[key];
                        
                        // 跳过函数和私有属性
                        if (typeof objValue === 'function' || key.charAt(0) === '_') {
                            continue;
                        }
                        
                        if (objValue === null) {
                            result[key] = null;
                        } else if (typeof objValue === 'string' || typeof objValue === 'number' || typeof objValue === 'boolean') {
                            result[key] = objValue;
                        } else if (objValue instanceof Array) {
                            result[key] = [];
                            for (var k = 0; k < objValue.length; k++) {
                                result[key].push(AEUtils.toPlainObject(objValue[k]));
                            }
                        } else if (typeof objValue === 'object') {
                            result[key] = AEUtils.toPlainObject(objValue);
                        } else {
                            result[key] = String(objValue);
                        }
                    } catch (propErr) {
                        // 忽略无法访问的属性
                    }
                }
            }
        } catch (iterErr) {
            result._error = String(iterErr);
        }
    }
    
    return result;
};

/**
 * 获取合成的安全信息
 * 
 * @param {CompItem} comp 合成对象
 * @returns {Object} 包含合成安全信息的对象
 */
AEUtils.getCompInfo = function(comp) {
    if (!comp || !(comp instanceof CompItem)) {
        return { error: "无效的合成对象" };
    }
    
    var info = {
        name: String(comp.name),
        id: Number(comp.id),
        width: Number(comp.width),
        height: Number(comp.height),
        duration: Number(comp.duration),
        frameRate: Number(comp.frameRate),
        numLayers: Number(comp.numLayers),
        displayStartTime: Number(comp.displayStartTime),
        workAreaStart: Number(comp.workAreaStart),
        workAreaDuration: Number(comp.workAreaDuration),
        layers: []
    };
    
    // 收集图层信息
    for (var i = 1; i <= comp.numLayers; i++) {
        try {
            var layer = comp.layer(i);
            var layerInfo = {
                name: String(layer.name),
                index: Number(layer.index)
            };
            
            // 安全地获取图层类型
            try {
                if (layer instanceof TextLayer) layerInfo.type = "文本";
                else if (layer instanceof ShapeLayer) layerInfo.type = "形状";
                else if (layer instanceof CameraLayer) layerInfo.type = "摄像机";
                else if (layer instanceof LightLayer) layerInfo.type = "灯光";
                else if (layer.source instanceof CompItem) layerInfo.type = "预合成";
                else if (layer.nullLayer) layerInfo.type = "空对象";
                else if (layer.adjustmentLayer) layerInfo.type = "调整层";
                else layerInfo.type = "素材";
            } catch (typeErr) {
                layerInfo.type = "未知";
            }
            
            // 添加基本属性
            try { layerInfo.enabled = Boolean(layer.enabled); } catch (e) {}
            try { layerInfo.inPoint = Number(layer.inPoint); } catch (e) {}
            try { layerInfo.outPoint = Number(layer.outPoint); } catch (e) {}
            try { layerInfo.solo = Boolean(layer.solo); } catch (e) {}
            try { layerInfo.shy = Boolean(layer.shy); } catch (e) {}
            try { layerInfo.locked = Boolean(layer.locked); } catch (e) {}
            
            info.layers.push(layerInfo);
        } catch (layerErr) {
            info.layers.push({
                name: "图层 #" + i,
                error: String(layerErr)
            });
        }
    }
    
    return info;
};

/**
 * 获取当前项目的安全信息
 * 
 * @returns {Object} 包含项目安全信息的对象
 */
AEUtils.getProjectInfo = function() {
    if (!app.project) {
        return { error: "无项目" };
    }
    
    var info = {
        name: app.project.file ? String(app.project.file.name) : "未保存项目",
        path: app.project.file ? String(app.project.file.fsName) : "",
        numItems: Number(app.project.numItems),
        bitsPerChannel: Number(app.project.bitsPerChannel),
        items: []
    };
    
    // 收集项目项目信息
    for (var i = 1; i <= app.project.numItems; i++) {
        try {
            var item = app.project.item(i);
            var itemInfo = {
                name: String(item.name),
                id: Number(item.id)
            };
            
            // 确定项目类型
            if (item instanceof CompItem) {
                itemInfo.type = "合成";
                itemInfo.width = Number(item.width);
                itemInfo.height = Number(item.height);
                itemInfo.duration = Number(item.duration);
            } else if (item instanceof FolderItem) {
                itemInfo.type = "文件夹";
                itemInfo.numItems = Number(item.numItems);
            } else if (item instanceof FootageItem) {
                itemInfo.type = "素材";
                if (item.mainSource instanceof FileSource) {
                    itemInfo.path = String(item.file.fsName);
                }
            }
            
            info.items.push(itemInfo);
        } catch (itemErr) {
            info.items.push({
                name: "项目 #" + i,
                error: String(itemErr)
            });
        }
    }
    
    return info;
};

// 导出实用工具
// 如果是从另一个脚本引入，确保返回AEUtils
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AEUtils;
} 