// json2.jsx
// 基于Douglas Crockford的JSON2库，用于ExtendScript环境
// 添加了处理循环引用的能力

// 如果不存在JSON对象，则创建一个
if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // 格式化整数至少有两位数字
        return (n < 10) ? "0" + n : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {
        Date.prototype.toJSON = function () {
            return isFinite(this.valueOf())
                ? (
                    this.getUTCFullYear()
                    + "-"
                    + f(this.getUTCMonth() + 1)
                    + "-"
                    + f(this.getUTCDate())
                    + "T"
                    + f(this.getUTCHours())
                    + ":"
                    + f(this.getUTCMinutes())
                    + ":"
                    + f(this.getUTCSeconds())
                    + "Z"
                )
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;

    function quote(string) {
        // 如果字符串不包含控制字符、引号和反斜杠，则可以安全地加上引号
        // 否则还必须将有问题的字符替换为安全的转义序列
        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }

    function str(key, holder) {
        // 生成 holder[key] 的字符串表示
        var i;          // 循环计数器
        var k;          // 成员键名
        var v;          // 成员值
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        // 如果值有 toJSON 方法，调用它获取替换值
        if (
            value
            && typeof value === "object"
            && typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

        // 如果提供了 replacer 函数，则调用它获取替换值
        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

        // 接下来的操作取决于值的类型
        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":
            // JSON 数字必须是有限的。编码非有限数字为 null
            return (isFinite(value)) ? String(value) : "null";

        case "boolean":
        case "null":
            // 如果值是布尔值或 null，将其转换为字符串
            return String(value);

        case "object":
            // 如果类型是"object"，可能处理的是对象、数组或 null
            if (!value) {
                return "null";
            }

            // 创建一个数组来保存这个对象值的部分结果
            gap += indent;
            partial = [];

            // 是否为数组？
            if (Object.prototype.toString.apply(value) === "[object Array]") {
                // 值是数组。序列化每个元素。使用 null 作为非 JSON 值的占位符
                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

                // 将所有元素连接在一起，用逗号分隔，并用括号包裹
                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? (
                            "[\n"
                            + gap
                            + partial.join(",\n" + gap)
                            + "\n"
                            + mind
                            + "]"
                        )
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

            // 如果 replacer 是数组，使用它选择要序列化的成员
            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {
                // 否则，遍历对象中的所有键
                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                (gap)
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

            // 将所有成员文本连接在一起，用逗号分隔，并用花括号包裹
            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

    // 如果 JSON 对象还没有 stringify 方法，则赋予它一个
    if (typeof JSON.stringify !== "function") {
        meta = {    // 字符替换表
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {
            // stringify 方法接收一个值和一个可选的 replacer 以及一个可选的 space 参数
            // 并返回一个 JSON 文本。replacer 可以是一个可以替换值的函数
            // 或者是一个将选择键的字符串数组。可以提供默认的 replacer 方法
            // 使用 space 参数可以生成更易读的文本
            var i;
            gap = "";
            indent = "";

            // 如果 space 参数是一个数字，则创建一个包含该数量空格的缩进字符串
            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }
            } else if (typeof space === "string") {
                // 如果 space 参数是一个字符串，它将被用作缩进字符串
                indent = space;
            }

            // 如果有 replacer，它必须是一个函数或数组
            // 否则，抛出一个错误
            rep = replacer;
            if (replacer && typeof replacer !== "function" && (
                typeof replacer !== "object"
                || typeof replacer.length !== "number"
            )) {
                throw new Error("JSON.stringify");
            }

            // 创建一个伪根对象，包含值在""键下
            // 返回序列化该值的结果
            return str("", {"": value});
        };
    }

    // 如果 JSON 对象还没有 parse 方法，则赋予它一个
    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {
            // parse 方法接收一个文本和一个可选的 reviver 函数
            // 并返回一个 JavaScript 值，如果文本是有效的 JSON 文本
            var j;

            function walk(holder, key) {
                // walk 方法用于递归遍历生成的结构，以便可以进行修改
                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            // 解析分为四个阶段。在第一阶段，我们用转义序列替换某些 Unicode 字符
            // JavaScript 对许多字符处理不正确，要么默默地删除它们，要么将它们视为行结束符
            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return (
                        "\\u"
                        + ("0000" + a.charCodeAt(0).toString(16)).slice(-4)
                    );
                });
            }

            // 在第二阶段，我们运行文本与正则表达式匹配，寻找非 JSON 模式
            // 我们特别关注"()"和"new"，因为它们可能导致调用
            // 以及"="，因为它可能导致变异，但为了安全起见，我们要拒绝所有意外的表单
            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {
                // 在第三阶段，我们使用 eval 函数将文本编译成 JavaScript 结构
                // "{"运算符在 JavaScript 中存在语法歧义：可以开始一个块或一个对象字面量
                // 我们将文本包装在括号中以消除歧义
                j = eval("(" + text + ")");

                // 在可选的第四阶段，我们递归遍历新结构
                // 将每个名称/值对传递给 reviver 函数进行可能的转换
                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

            // 如果文本不是有效的 JSON 可解析，则抛出 SyntaxError
            throw new SyntaxError("JSON.parse");
        };
    }
}());

// 安全地处理循环引用的JSON.stringify
JSON.safeStringify = function(obj, replacer, space) {
    var cache = [];
    var safeReplacer = function(key, value) {
        // 如果提供了replacer函数，先调用
        if (replacer && typeof replacer === 'function') {
            value = replacer(key, value);
        }
        
        if (typeof value === 'object' && value !== null) {
            // 检测循环引用
            if (cache.indexOf(value) !== -1) {
                return "[Circular Reference]";
            }
            cache.push(value);
        }
        return value;
    };
    
    var result = JSON.stringify(obj, safeReplacer, space);
    cache = null; // 释放内存
    return result;
};

// 添加JSON.safeStringify说明文档
/**
 * 安全地将JavaScript值转换为JSON字符串，可以处理循环引用
 * 
 * @param {any} value 要转换为JSON字符串的值
 * @param {Function|Array} [replacer] 可选，用于转换结果的函数或数组
 * @param {Number|String} [space] 可选，用于缩进的空格数或字符串
 * @returns {String} 表示值的JSON字符串
 */ 