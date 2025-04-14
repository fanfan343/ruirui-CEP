// serializeUtils.jsx
// 专门用于处理ExtendScript环境中的序列化/反序列化问题
// 处理循环引用、特殊数据类型和After Effects对象

// 确保已加载json2.jsx
if (typeof JSON === "undefined") {
    try {
        var libFolder = new File($.fileName).parent;
        $.evalFile(new File(libFolder.absoluteURI + "/json2.jsx"));
    } catch (e) {
        alert("无法加载json2.jsx: " + e.toString());
    }
}

// 创建序列化工具命名空间
var SerializeUtils = {};

/**
 * 检测对象是否包含循环引用
 * 
 * @param {Object} obj 要检查的对象
 * @returns {Boolean} 如果包含循环引用则返回true，否则返回false
 */
SerializeUtils.hasCircularReferences = function(obj) {
    var seenObjects = [];
    
    function detect(obj) {
        if (obj && typeof obj === 'object') {
            if (seenObjects.indexOf(obj) !== -1) {
                return true;
            }
            seenObjects.push(obj);
            
            for (var key in obj) {
                if (obj.hasOwnProperty && obj.hasOwnProperty(key)) {
                    try {
                        if (detect(obj[key])) {
                            return true;
                        }
                    } catch (e) {
                        // 忽略无法访问的属性
                    }
                }
            }
        }
        return false;
    }
    
    return detect(obj);
};

/**
 * 安全地序列化对象，处理循环引用
 * 
 * @param {Object} obj 要序列化的对象
 * @param {Number|String} [space] 可选的缩进
 * @returns {String} 序列化后的JSON字符串
 */
SerializeUtils.stringify = function(obj, space) {
    var cache = [];
    var keyCache = [];
    
    try {
        var result = JSON.stringify(obj, function(key, value) {
            // 处理特殊值
            if (value === undefined) {
                return { __type: "undefined" };
            }
            
            if (value === Infinity) {
                return { __type: "Infinity" };
            }
            
            if (value === -Infinity) {
                return { __type: "-Infinity" };
            }
            
            if (typeof value === 'number' && isNaN(value)) {
                return { __type: "NaN" };
            }
            
            if (value instanceof Date) {
                return { 
                    __type: "Date", 
                    value: value.toISOString() 
                };
            }
            
            if (typeof value === 'function') {
                return { 
                    __type: "Function", 
                    name: value.name || "anonymous" 
                };
            }
            
            // 处理循环引用
            if (typeof value === 'object' && value !== null) {
                var index = cache.indexOf(value);
                if (index !== -1) {
                    return { 
                        __type: "CircularReference", 
                        path: keyCache[index] || "root" 
                    };
                }
                cache.push(value);
                keyCache.push(key || "root");
                
                // 处理After Effects特定对象
                if (value.toString && (
                    value.toString() === "[object CompItem]" ||
                    value.toString() === "[object Layer]" ||
                    value.toString() === "[object FootageItem]" ||
                    value.toString() === "[object Property]"
                )) {
                    var type = value.toString().match(/\[object (\w+)\]/)[1];
                    var result = { __type: "AEObject", objectType: type };
                    
                    // 尝试提取基本属性
                    try { result.name = String(value.name); } catch (e) {}
                    try { result.id = Number(value.id); } catch (e) {}
                    try { result.index = Number(value.index); } catch (e) {}
                    
                    return result;
                }
            }
            
            return value;
        }, space);
        
        return result;
    } catch (e) {
        return JSON.stringify({ 
            __type: "Error", 
            message: "序列化错误: " + e.toString() 
        });
    } finally {
        cache = null;
        keyCache = null;
    }
};

/**
 * 将序列化的JSON字符串反序列化为对象，
 * 恢复特殊类型和标记的循环引用
 * 
 * @param {String} jsonString 要解析的JSON字符串
 * @returns {Object} 解析后的对象
 */
SerializeUtils.parse = function(jsonString) {
    return JSON.parse(jsonString, function(key, value) {
        if (value && typeof value === 'object' && value.__type) {
            switch (value.__type) {
                case "undefined":
                    return undefined;
                case "Infinity":
                    return Infinity;
                case "-Infinity":
                    return -Infinity;
                case "NaN":
                    return NaN;
                case "Date":
                    return new Date(value.value);
                case "Function":
                    // 只能恢复函数的基本信息，不能恢复实际代码
                    return "(function " + value.name + "(){})";
                case "CircularReference":
                    return "[引用: " + value.path + "]";
                case "AEObject":
                    return "[AE对象: " + value.objectType + (value.name ? " '" + value.name + "'" : "") + "]";
                case "Error":
                    // 创建一个错误对象
                    console.error(value.message);
                    return new Error(value.message);
            }
        }
        return value;
    });
};

/**
 * 创建一个对象的深拷贝，安全处理循环引用
 * 
 * @param {Object} obj 要拷贝的对象
 * @returns {Object} 深拷贝后的对象
 */
SerializeUtils.deepCopy = function(obj) {
    // 如果不是对象或为null，直接返回
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    
    try {
        // 尝试使用序列化/反序列化进行深拷贝
        var jsonString = SerializeUtils.stringify(obj);
        return SerializeUtils.parse(jsonString);
    } catch (e) {
        // 如果序列化失败，使用手动深拷贝
        console.error("序列化深拷贝失败，使用手动深拷贝: " + e.toString());
        return SerializeUtils._manualDeepCopy(obj);
    }
};

/**
 * 手动执行深拷贝，处理循环引用
 * 私有辅助方法
 * 
 * @private
 * @param {Object} obj 要拷贝的对象
 * @param {Array} [seen] 已处理对象数组
 * @param {Array} [copies] 已创建的拷贝数组
 * @returns {Object} 深拷贝后的对象
 */
SerializeUtils._manualDeepCopy = function(obj, seen, copies) {
    seen = seen || [];
    copies = copies || [];
    
    // 检测循环引用
    var index = seen.indexOf(obj);
    if (index !== -1) {
        return copies[index];
    }
    
    // 根据类型创建新对象
    var copy;
    
    // 处理数组
    if (Array.isArray(obj)) {
        copy = [];
        seen.push(obj);
        copies.push(copy);
        
        for (var i = 0; i < obj.length; i++) {
            copy[i] = SerializeUtils._manualDeepCopy(obj[i], seen, copies);
        }
    } 
    // 处理日期
    else if (obj instanceof Date) {
        copy = new Date(obj.getTime());
    }
    // 处理普通对象
    else {
        copy = {};
        seen.push(obj);
        copies.push(copy);
        
        // 复制所有可枚举属性
        for (var key in obj) {
            if (obj.hasOwnProperty && obj.hasOwnProperty(key)) {
                try {
                    copy[key] = SerializeUtils._manualDeepCopy(obj[key], seen, copies);
                } catch (e) {
                    copy[key] = "无法拷贝: " + e.toString();
                }
            }
        }
    }
    
    return copy;
};

// 导出工具
// 如果是从另一个脚本引入，确保返回工具对象
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SerializeUtils;
} 