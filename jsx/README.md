# ExtendScript JSON序列化工具库

本目录包含一系列用于在Adobe ExtendScript环境中安全处理JSON序列化的工具库，特别是解决循环引用问题和处理特殊数据类型。

## 文件结构

- `lib/json2.jsx` - 基于Douglas Crockford的JSON2库，提供基本的JSON支持
- `lib/AEUtils.jsx` - After Effects特定的工具函数，包括安全序列化和获取AE对象信息
- `lib/serializeUtils.jsx` - 专门用于处理复杂序列化场景的工具，包括循环引用和特殊数据类型

## 主要功能

### 1. JSON2 基础库

提供ExtendScript环境中缺失的基本JSON功能：

- `JSON.stringify()` - 将JavaScript对象序列化为JSON字符串
- `JSON.parse()` - 将JSON字符串解析为JavaScript对象
- `JSON.safeStringify()` - 处理基本的循环引用情况

### 2. SerializeUtils 增强工具

专门用于处理复杂的序列化情况：

- `SerializeUtils.hasCircularReferences(obj)` - 检测对象是否包含循环引用
- `SerializeUtils.stringify(obj, space)` - 增强的序列化，可处理：
  - 循环引用
  - 特殊值（undefined, NaN, Infinity等）
  - 特殊对象（Date, Function）
  - After Effects特定对象
- `SerializeUtils.parse(jsonString)` - 增强的反序列化，能还原特殊类型
- `SerializeUtils.deepCopy(obj)` - 创建对象的深拷贝，安全处理循环引用

### 3. AEUtils 实用工具

针对After Effects的便捷功能：

- `AEUtils.safeStringify(obj, replacer, space)` - 安全序列化AE对象
- `AEUtils.toPlainObject(aeObject, propertiesToKeep)` - 将AE对象转换为纯JavaScript对象
- `AEUtils.getCompInfo(comp)` - 获取合成的安全信息
- `AEUtils.getProjectInfo()` - 获取当前项目的安全信息

## 使用方法

### 基本引入

在ExtendScript文件顶部引入所需库：

```javascript
//@include "./lib/json2.jsx"
//@include "./lib/AEUtils.jsx"
//@include "./lib/serializeUtils.jsx"
```

### 安全序列化示例

```javascript
// 获取当前合成信息
function getCompInfo() {
    try {
        if (!(app.project.activeItem instanceof CompItem)) {
            return SerializeUtils.stringify({ error: "没有活动合成" });
        }
        
        var compInfo = AEUtils.getCompInfo(app.project.activeItem);
        return SerializeUtils.stringify(compInfo, 2); // 使用2空格缩进
    } catch (err) {
        return SerializeUtils.stringify({ 
            error: "获取合成信息错误: " + err.toString() 
        });
    }
}
```

### 处理循环引用

SerializeUtils会自动检测和处理循环引用，将其表示为特殊对象：

```javascript
var obj = {};
obj.self = obj; // 循环引用

// 序列化结果示例：
// {"self":{"__type":"CircularReference","path":"root"}}
var jsonString = SerializeUtils.stringify(obj);
```

### 特殊数据类型

SerializeUtils能正确处理JavaScript中的特殊数据类型：

```javascript
var specialValues = {
    undef: undefined,
    inf: Infinity,
    nan: NaN,
    date: new Date(),
    func: function hello() { return "world"; }
};

// 序列化后可以通过SerializeUtils.parse恢复大部分特殊类型
var jsonString = SerializeUtils.stringify(specialValues);
var restored = SerializeUtils.parse(jsonString);
```

## 注意事项

1. **性能考量**：处理大型对象或深层嵌套时，序列化过程可能较慢
2. **函数限制**：函数只能保存名称信息，无法恢复实际代码
3. **After Effects对象**：AE特定对象会被转换为包含基本信息的安全对象
4. **内存使用**：处理大对象时注意内存使用，特别是在检测循环引用时

## 贡献

欢迎提交问题报告和改进建议。主要开发目标：

1. 提高序列化性能
2. 增加对更多AE特定对象的支持
3. 改进错误处理和诊断能力

## 许可

[LICENSE文件中的许可协议] 