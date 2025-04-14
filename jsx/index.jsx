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