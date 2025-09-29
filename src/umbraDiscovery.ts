import dgram from "node:dgram";
import { UmbraUdpBroadcast } from "./generated/Common/Types/UmbraServiceTypes";
import { EventEmitter } from "node:stream";

export class UmbraDiscoveryClient extends EventEmitter {
    private port: number;
    private addr: string;
    private socket: dgram.Socket;

    constructor(port: number = 17474, address: string = "225.68.67.3") {
        super();
        this.port = port;
        this.addr = address;
        this.socket = dgram.createSocket({ type: "udp4", reuseAddr: true });
        this.socket.on("message", (msg, rinfo) => {
            const broadcast = UmbraUdpBroadcast.decode(msg);
            this.emit("broadcast", broadcast);
        });
        this.socket.bind(this.port, () => {
            this.socket.addMembership(this.addr);
            console.log("Listening for Umbra broadcasts");
        });
    }

    close() {
        this.socket.close();
    }
}
