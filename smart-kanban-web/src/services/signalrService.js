import { HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';

const connection = new HubConnectionBuilder()
    .withUrl("http://localhost:5078/hubs/kanban", {
        accessTokenFactory: () => localStorage.getItem('jwt_token')
    })
    .withAutomaticReconnect()
    .build();

export const startSignalRConnection = async (boardId) => {
    try {
        if (connection.state === HubConnectionState.Disconnected) {
            await connection.start();
            console.log("Đã kết nối SignalR thành công!");
        }
        await connection.invoke("JoinBoard", boardId);
    } catch (err) {
        console.error("Lỗi kết nối SignalR: ", err);
    }
};

export const onCardMoved = (callback) => {
    connection.off("CardMoved");
    connection.on("CardMoved", (data) => {
        callback(data);
    });
};

export default connection;