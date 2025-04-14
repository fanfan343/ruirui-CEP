// jsonUtils.jsx
// 提供安全的JSON序列化函数，特别是处理循环引用问题

// 确保JSON库已加载
$.evalFile(new File($.fileName).parent.absoluteURI + "/json2.jsx");

/**
 * 安全的JSON序列化函数，处理循环引用
 * @param {Object} obj - 要序列化的对象
 * @return {String} JSON字符串
 */
function safeStringify(obj) {
    var cache = [];
    try {
        var result = JSON.stringify(obj, function(key, value) {
            // 处理循环引用
            if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                    // 检测到循环引用，返回引用说明而不是值
                    return '[循环引用]';
                }
                cache.push(value);
            }
            
            // 处理函数
            if (typeof value === 'function') {
                return '[函数]';
            }
            
            return value;
        });
        
        return result;
    } catch (e) {
        return JSON.stringify({
            error: "JSON序列化错误: " + e.toString()
        });
    } finally {
        cache = null; // 释放内存
    }
}

/**
 * 专为After Effects对象设计的安全序列化函数
 * 创建一个只包含基本数据的对象，避免序列化AE的复杂对象
 * @param {Object} aeObject - After Effects对象
 * @param {Array} propertiesToInclude - 要包含的属性数组
 * @return {Object} 安全的可序列化对象
 */
function createSafeAEObject(aeObject, propertiesToInclude) {
    if (!aeObject) return null;
    
    var safeObject = {};
    
    try {
        // 如果提供了属性列表，只包含这些属性
        if (propertiesToInclude && propertiesToInclude.length > 0) {
            for (var i = 0; i < propertiesToInclude.length; i++) {
                var prop = propertiesToInclude[i];
                try {
                    if (aeObject[prop] !== undefined) {
                        // 根据类型转换属性值
                        if (typeof aeObject[prop] === "number") {
                            safeObject[prop] = Number(aeObject[prop]);
                        } else if (typeof aeObject[prop] === "boolean") {
                            safeObject[prop] = Boolean(aeObject[prop]);
                        } else if (typeof aeObject[prop] === "string") {
                            safeObject[prop] = String(aeObject[prop]);
                        } else if (aeObject[prop] instanceof Array) {
                            // 处理数组
                            safeObject[prop] = [];
                            for (var j = 0; j < aeObject[prop].length; j++) {
                                safeObject[prop].push(String(aeObject[prop][j]));
                            }
                        } else {
                            // 对于其他类型，转为字符串
                            safeObject[prop] = String(aeObject[prop]);
                        }
                    }
                } catch (propError) {
                    safeObject[prop] = "[获取错误: " + propError.toString() + "]";
                }
            }
        } else {
            // 没有提供属性列表，使用对象自身的属性
            for (var key in aeObject) {
                try {
                    if (typeof aeObject[key] !== "function" && key.charAt(0) !== "_") {
                        if (typeof aeObject[key] === "number") {
                            safeObject[key] = Number(aeObject[key]);
                        } else if (typeof aeObject[key] === "boolean") {
                            safeObject[key] = Boolean(aeObject[key]);
                        } else if (typeof aeObject[key] === "string") {
                            safeObject[key] = String(aeObject[key]);
                        } else {
                            safeObject[key] = String(aeObject[key]);
                        }
                    }
                } catch (keyError) {
                    // 忽略无法获取的属性
                }
            }
        }
    } catch (e) {
        safeObject.error = "创建安全对象错误: " + e.toString();
    }
    
    return safeObject;
}

// 暴露函数到全局作用域
if (typeof $ !== "undefined") {
    $.safeStringify = safeStringify;
    $.createSafeAEObject = createSafeAEObject;
} 