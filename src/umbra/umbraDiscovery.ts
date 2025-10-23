import dgram from "node:dgram";
import { ClientProgramInfo, UmbraUdpBroadcast } from "../generated/Common/Types/UmbraServiceTypes";
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
            if (!broadcast.umbraServer) return;
            console.log(`Received broadcast from ${broadcast.umbraServer.programInfo?.programmName} at ${rinfo.address}`);
            this.emit("broadcast", broadcast.umbraServer);
        });
        this.socket.bind(this.port, () => {
            this.socket.addMembership(this.addr);
            console.log("Listening for Umbra broadcasts");
        });
    }

    public async getUmbraServerInfo(umbraServerName: string, timeout = 30000): Promise<ClientProgramInfo | null> {
        return new Promise(resolve => {
            const timer = setTimeout(() => resolve(null), timeout);

            const listener = (broadcast: ClientProgramInfo) => {
                if (broadcast.clientInfo?.clientname === umbraServerName) {
                    clearTimeout(timer);
                    resolve(broadcast);
                }
            };

            this.once("broadcast", listener);
        });
    }



    close() {
        this.socket.close();
    }
}
